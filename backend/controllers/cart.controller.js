import { prisma } from "../lib/db.js";

export const addToCart = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { quantity = 1, color = null } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const productDoc = await prisma.product.findFirst({
      where: { id: BigInt(product_id), deleted_at: null },
      include: { product_colors: true },
    });
    
    if (!productDoc) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    const qty = Number(quantity) || 1;
    if (qty < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Find or create cart
    let cart = await prisma.cart.findFirst({ 
      where: { user_id: BigInt(userId), deleted_at: null } 
    });
    
    if (!cart) {
      cart = await prisma.cart.create({ 
        data: { user_id: BigInt(userId) } 
      });
    }

    // Process color - convert object to JSON string if needed
    let colorValue = null;
    if (color) {
      if (typeof color === 'object' && color !== null) {
        colorValue = {
          name: color.name || '',
          code: color.code || '',
        }; // normalize to consistent shape
      } else if (typeof color === 'string') {
        try {
          const parsed = JSON.parse(color);
          colorValue = {
            name: parsed?.name || '',
            code: parsed?.code || '',
          };
        } catch {
          colorValue = { name: color, code: '' };
        }
      }
    }

    // Resolve product_color and stock check
    let productColor = null;
    if (colorValue && (colorValue.code || colorValue.name)) {
      productColor = productDoc.product_colors.find(
        (c) =>
          (colorValue.code && c.code === colorValue.code) ||
          (colorValue.name && c.name === colorValue.name)
      );
      if (!productColor) {
        return res.status(400).json({ message: "Selected color not available" });
      }
      if (productColor.quantity < qty) {
        return res.status(400).json({ message: "Insufficient stock for selected color" });
      }
    } else if (productDoc.product_colors.length > 0) {
      // If product has color variants, require color selection
      return res.status(400).json({ message: "Color is required for this product" });
    } else {
      if (productDoc.quantity < qty) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
    }

    // Build color filter for equality matching
    const colorFilter = colorValue
      ? { equals: colorValue }
      : { equals: null };

    // Check if item already exists in cart
    const existing = await prisma.cartItem.findFirst({
      where: { 
        cart_id: cart.id, 
        product_id: BigInt(product_id), 
        color: colorFilter,
        deleted_at: null 
      },
    });

    if (existing) {
      // Update existing item (same product & color)
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + qty,
          // keep existing color (already matched), do not overwrite other colors
        },
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id: BigInt(product_id),
          quantity: qty,
          color: colorValue,
        },
      });
    }

    const summary = await summarizeCart(cart.id);
    
    res.status(201).json({ 
      message: "Product added to cart", 
      cart_summary: summary 
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ 
      message: "Failed to add to cart", 
      error: error.message 
    });
  }
};

export const getCartProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await prisma.cart.findFirst({ where: { user_id: BigInt(userId) } });
    if (!cart) {
      return res.json({ 
        cart: { 
          id: null, 
          total_items: 0, 
          total_price: 0, 
          total_original_price: 0, 
          total_discount: 0, 
          items: [] 
        } 
      });
    }
    
    const items = await prisma.cartItem.findMany({ 
      where: { cart_id: cart.id, deleted_at: null, product: { deleted_at: null } }, 
      include: { product: true } 
    });
    
    const summary = await summarizeCart(cart.id);
    
    // Format items to match frontend CartItem type
    const formattedItems = items.map(item => {
      const product = item.product;
      const price = Number(product.price);
      const discount = Number(product.discount || 0);
      const finalPrice = price - discount;
      const unitFinalPrice = finalPrice;
      const subtotal = finalPrice * item.quantity;
      
      // Get first image from product.img array
      const imageUrl = Array.isArray(product.img) && product.img.length > 0 
        ? product.img[0] 
        : '';
      
      // Parse color from cartItem.color (can be string or object)
      let colorObj = { name: '', code: '' };
      if (item.color) {
        if (typeof item.color === 'string') {
          // If color is a string, try to parse it
          try {
            colorObj = JSON.parse(item.color);
          } catch {
            colorObj = { name: item.color, code: '' };
          }
        } else if (typeof item.color === 'object') {
          colorObj = item.color;
        }
      }
      
      return {
        id: Number(item.id),
        product_id: Number(item.product_id),
        name: product.name || '',
        price: price,
        final_price: finalPrice,
        discount: discount,
        subtotal: subtotal,
        unit_final_price: unitFinalPrice,
        image_url: imageUrl,
        sold_quantity: item.quantity,
        max_quantity: Number(product.quantity || 0),
        quantity: item.quantity,
        color: {
          code: colorObj.code || '',
          name: colorObj.name || ''
        }
      };
    });
    
    res.json({ 
      cart: { 
        id: Number(cart.id), 
        total_items: summary.total_items, 
        total_price: summary.total_price, 
        total_original_price: summary.total_original_price, 
        total_discount: summary.total_discount, 
        items: formattedItems 
      } 
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get cart", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await prisma.cart.findFirst({ where: { user_id: BigInt(userId) } });
    if (!cart) return res.json({ message: "All items removed from cart" });
    await prisma.cartItem.updateMany({
      where: { cart_id: cart.id },
      data: { deleted_at: new Date() },
    });
    const summary = await summarizeCart(cart.id);
    res.json({ message: "All items removed from cart", cart_summary: summary });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to clear cart", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { quantity, cart_item_id } = req.body;
    const userId = req.user.id;
    if (quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    const cart = await prisma.cart.findFirst({ where: { user_id: BigInt(userId) } });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    
    let cartItem = null;
    if (cart_item_id) {
      cartItem = await prisma.cartItem.findFirst({
        where: { id: BigInt(cart_item_id), cart_id: cart.id, deleted_at: null },
        include: { product: true },
      });
    } else {
      cartItem = await prisma.cartItem.findFirst({
        where: { cart_id: cart.id, product_id: BigInt(product_id), deleted_at: null },
        include: { product: true },
      });
    }

    if (!cartItem) return res.status(404).json({ message: "Item not found in cart" });
    if (cartItem.product.quantity < quantity) return res.status(400).json({ message: "Insufficient stock" });

    // Check stock for color before update
    let productColor = null;
    if (cartItem.color) {
      const colorVal = typeof cartItem.color === "string" ? (() => { try { return JSON.parse(cartItem.color); } catch { return { name: cartItem.color, code: "" }; }})() : cartItem.color;
      productColor = await prisma.productColor.findFirst({
        where: {
          product_id: cartItem.product_id,
          OR: [
            { code: colorVal.code || "" },
            { name: colorVal.name || "" },
          ],
        },
      });
      if (productColor && productColor.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock for selected color" });
      }
    } else {
      if (cartItem.product.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
    }

    const updatedItem = await prisma.cartItem.update({ where: { id: cartItem.id }, data: { quantity: Number(quantity) } });
    const summary = await summarizeCart(cart.id);
    res.json({ message: "Quantity updated", cart_item: updatedItem, cart_summary: summary });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update quantity", error: error.message });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { cart_item_id } = req.query;
    const userId = req.user.id;
    const cart = await prisma.cart.findFirst({ where: { user_id: BigInt(userId) } });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    
    let cartItem = null;
    if (cart_item_id) {
      cartItem = await prisma.cartItem.findFirst({
        where: { id: BigInt(cart_item_id), cart_id: cart.id, deleted_at: null },
      });
    } else {
      cartItem = await prisma.cartItem.findFirst({
        where: { cart_id: cart.id, product_id: BigInt(product_id), deleted_at: null },
      });
    }

    if (!cartItem) return res.status(404).json({ message: "Item not found in cart" });
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { deleted_at: new Date() },
    });
    const summary = await summarizeCart(cart.id);
    res.json({ message: "Item removed from cart", cart_summary: summary });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete cart item", error: error.message });
  }
};

async function summarizeCart(cartId) {
  const items = await prisma.cartItem.findMany({
    where: { cart_id: cartId, deleted_at: null, product: { deleted_at: null } },
    include: { product: true },
  });
  let total_items = 0;
  let total_original_price = 0;
  let total_price = 0;
  for (const it of items) {
    const price = Number(it.product.price);
    const discount = Number(it.product.discount || 0);
    const unit_final = price - discount;
    total_items += it.quantity;
    total_original_price += price * it.quantity;
    total_price += unit_final * it.quantity;
  }
  const total_discount = total_original_price - total_price;
  return { total_items, total_original_price, total_price, total_discount };
}
