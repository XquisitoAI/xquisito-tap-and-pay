"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Restaurant, Branch, RestaurantParams } from "../types/restaurant";
import { restaurantService } from "../services/restaurant.service";

interface RestaurantContextType {
  restaurant: Restaurant | null;
  branch: Branch | null;
  params: RestaurantParams | null;
  loading: boolean;
  error: string | null;
  setRestaurant: (restaurant: Restaurant) => void;
  setBranch: (branch: Branch) => void;
  setParams: (params: RestaurantParams) => void;
  clearRestaurant: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [params, setParamsState] = useState<RestaurantParams | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearRestaurant = useCallback(() => {
    setRestaurant(null);
    setBranch(null);
    setParamsState(null);
    setError(null);
  }, []);

  // Función para establecer params y disparar la carga del restaurante
  const setParams = useCallback((newParams: RestaurantParams) => {
    setParamsState(newParams);
  }, []);

  // Cargar datos del restaurante cuando cambian los params
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!params?.restaurantId || !params?.branchNumber) {
        return;
      }

      // Si ya tenemos el restaurante cargado para estos params, no recargar
      if (restaurant && restaurant.id === parseInt(params.restaurantId)) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log("🍽️ Fetching restaurant data for:", params.restaurantId, params.branchNumber);

        const restaurantData = await restaurantService.getRestaurantByBranch(
          parseInt(params.restaurantId),
          parseInt(params.branchNumber)
        );

        console.log("✅ Restaurant loaded:", restaurantData.name);
        setRestaurant(restaurantData as Restaurant);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load restaurant";
        console.error("❌ Error loading restaurant:", errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [params?.restaurantId, params?.branchNumber]);

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        branch,
        params,
        loading,
        error,
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
