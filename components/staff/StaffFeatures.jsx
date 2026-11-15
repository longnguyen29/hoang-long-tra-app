"use client";
import { createContext, useContext } from "react";
export const StaffFeaturesContext = createContext({ partnerNetworkEnabled: false, allowedModules: null });
export const useStaffFeatures = () => useContext(StaffFeaturesContext);
