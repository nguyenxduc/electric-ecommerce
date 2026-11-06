import mock from "./mock.js";
import ghn from "./ghn.js";
import ghtk from "./ghtk.js";

const PROVIDERS = { mock, ghn, ghtk };

// Ten den tu DB/URL nen khong ep nem loi: khong khop thi tra undefined cho caller
export const getProvider = (name) => PROVIDERS[name];
export const PROVIDER_NAMES = Object.keys(PROVIDERS);
