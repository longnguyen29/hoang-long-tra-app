"use client";
import { createContext, useContext } from "react";
export const StaffFeaturesContext = createContext({ partnerNetworkEnabled: false });
export const useStaffFeatures = () => useContext(StaffFeaturesContext);
