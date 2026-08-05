import type { Configuration } from "@azure/msal-browser";
/**
// これは「値をimportする」という意味
import { Configuration } from "@azure/msal-browser"

// これは「型だけをimportする」という意味
import type { Configuration } from "@azure/msal-browser"
*/

export const msalConfig: Configuration = {
  auth: {
    clientId: "ea0154ee-3f9e-4c9a-9bc7-0cb2b9356235",
    authority:
      "https://login.microsoftonline.com/1b1aa5b3-eaf4-428d-af70-3b2ca3a9e3c6",
    redirectUri: "http://localhost:5173",
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};
