import { prisma } from "./db.js";

// Reads a numeric platform setting by key, falling back to defaultValue
// when the row is missing or not a number.
export const getSettingNumber = async (key, defaultValue) => {
  try {
    const setting = await prisma.setting.findFirst({
      where: { key, deleted_at: null },
    });
    if (!setting) return defaultValue;
    const n = Number(setting.value);
    return Number.isFinite(n) ? n : defaultValue;
  } catch (error) {
    console.error(`getSettingNumber(${key}) error:`, error);
    return defaultValue;
  }
};
