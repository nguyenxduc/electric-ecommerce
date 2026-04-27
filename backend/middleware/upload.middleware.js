import multer from "multer";

const storage = multer.diskStorage({});

export const upload = multer({ storage });

// Memory storage for Cloudinary uploads
const memoryStorage = multer.memoryStorage();
export const uploadMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});


