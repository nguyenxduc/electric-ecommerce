import { asyncHandler } from "../middleware/error.middleware.js";
import * as addressService from "../services/address.service.js";

const STATUS = { INVALID: 400, LIMIT: 400, NOT_FOUND: 404 };

const send = (res, result, okStatus = 200) => {
  if (!result.ok) {
    return res.status(STATUS[result.code] ?? 400).json({ success: false, message: result.message });
  }
  res.status(okStatus).json({ success: true, data: result.address ?? null });
};

export const listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await addressService.listAddresses(req.user.id) });
});

export const createAddress = asyncHandler(async (req, res) => {
  send(res, await addressService.createAddress(req.user.id, req.body), 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  send(res, await addressService.updateAddress(req.user.id, req.params.id, req.body));
});

export const deleteAddress = asyncHandler(async (req, res) => {
  send(res, await addressService.deleteAddress(req.user.id, req.params.id));
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  send(res, await addressService.setDefaultAddress(req.user.id, req.params.id));
});
