"use client";

import { useRef, useState, useEffect } from "react";
import { useTableNavigation } from "@/app/hooks/useTableNavigation";
import MenuHeaderBack from "@/app/components/headers/MenuHeader";
import { Loader2 } from "lucide-react";
import { useTable } from "@/app/context/TableContext";
import { useGuest } from "@/app/context/GuestContext";
import { orderService } from "@/app/services/order.service";

export default function UserPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tableNumber, navigateWithTable } = useTableNavigation();
  const { state, loadTableData } = useTable();
  const { guestId, setGuestName } = useGuest();

  // Debug: verificar que guestId está disponible
  useEffect(() => {
    console.log("🔍 UserPage - guestId disponible:", guestId);
    console.log("🔍 UserPage - orderId disponible:", state.order?.order_id);
  }, [guestId, state.order?.order_id]);

  // Función para validar que solo se ingresen caracteres de texto válidos para nombres
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const textOnlyRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]*$/;

    if (textOnlyRegex.test(value)) {
      setUserName(value);
    }
  };

  // Manejar presión de Enter/Intro
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && userName.trim() && !isSubmitting) {
      e.preventDefault();
      handleProceedToOrder();
    }
  };

  // Manejar foco del input para scroll al teclado
  const handleInputFocus = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);
  };

  const handleProceedToOrder = async () => {
    if (userName.trim()) {
      setIsSubmitting(true);
      try {
        // Asegurar que tenemos un guest_id
        let currentGuestId = guestId;

        // Si no hay guestId del contexto, obtenerlo desde localStorage
        if (!currentGuestId) {
          currentGuestId = localStorage.getItem("xquisito-guest-id");
        }

        // Guardar el nombre del invitado en el contexto
        setGuestName(userName.trim());

        // Agregar usuario invitado a active_users
        if (state.order?.order_id) {
          console.log("💾 Agregando invitado a active_users:", {
            orderId: state.order.order_id,
            guestId: currentGuestId,
            userName: userName.trim(),
          });

          const response = await orderService.addActiveUser(
            state.order.order_id,
            undefined,
            currentGuestId,
            userName.trim()
          );

          console.log("✅ Respuesta de addActiveUser:", response);

          // Recargar datos de la mesa para actualizar activeUsers en el contexto
          await loadTableData();
          console.log("🔄 Datos de mesa actualizados");
        } else {
          console.error("❌ No hay order_id disponible");
        }
        navigateWithTable("/payment-options");
      } catch (error) {
        console.error("❌ Error submitting order:", error);
        // Si hay error, ocultar la animación y continuar con navegación
        navigateWithTable("/payment-options");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-meduim text-gray-800 mb-4 md:mb-6">
            Mesa Inválida
          </h1>
          <p className="text-gray-600 text-base md:text-lg lg:text-xl">
            Por favor escanee el código QR
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-linear-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />

      <div className="px-4 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-linear-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center">
            <h2 className="font-medium text-white text-3xl md:text-4xl lg:text-5xl leading-7 md:leading-9 lg:leading-tight mt-2 md:mt-3 mb-6 md:mb-8">
              Ingresa tu nombre para continuar
            </h2>
          </div>
        </div>

        <div className="flex-1 h-full flex flex-col">
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6 md:px-8 lg:px-10 pb-32">
            <div className="flex flex-col items-center w-full pt-32 md:pt-36 lg:pt-40">
              <div className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl lg:text-2xl font-medium text-black">
                  Tu nombre
                </h2>
              </div>

              <div className="w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nombre"
                  value={userName}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  className="w-full px-4 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5 border-0 border-b border-black text-black text-2xl md:text-3xl lg:text-4xl text-center font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center py-4 md:py-5 lg:py-6">
        <div className="mx-4 md:mx-6 lg:mx-8 w-full max-w-full px-4 md:px-6 lg:px-8">
          <button
            onClick={handleProceedToOrder}
            disabled={!userName.trim()}
            className={`w-full py-4 md:py-5 lg:py-6 rounded-full transition-all text-white cursor-pointer text-base md:text-lg lg:text-xl ${
              userName.trim() && !isSubmitting
                ? "bg-linear-to-r from-[#34808C] to-[#173E44] animate-pulse-button active:scale-95"
                : "bg-linear-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <Loader2 className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 animate-spin" />
              </div>
            ) : (
              "Continuar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
