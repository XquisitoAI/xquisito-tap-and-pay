"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Restaurant, Branch, RestaurantParams } from "../types/restaurant";

interface RestaurantContextType {
  restaurant: Restaurant | null;
  branch: Branch | null;
  params: RestaurantParams | null;
  setRestaurant: (restaurant: Restaurant) => void;
  setBranch: (branch: Branch) => void;
  setParams: (params: RestaurantParams) => void;
  clearRestaurant: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [params, setParams] = useState<RestaurantParams | null>(null);

  const clearRestaurant = useCallback(() => {
    setRestaurant(null);
    setBranch(null);
    setParams(null);
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        branch,
        params,
        setRestaurant,
        setBranch,
        setParams,
        clearRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return context;
};
