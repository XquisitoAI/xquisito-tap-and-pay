"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useTable } from "@/app/context/TableContext";
import { useTableNavigation } from "@/app/hooks/useTableNavigation";
import { useRestaurant } from "@/app/context/RestaurantContext";
import { usePayment } from "@/app/context/PaymentContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useEcartPay } from "@/app/hooks/useEcartPay";
import MenuHeaderBack from "@/app/components/headers/MenuHeader";
import { paymentService } from "@/app/services/payment.service";
import { Plus, Trash2, Loader2, CircleAlert, X } from "lucide-react";
import { getCardTypeIcon } from "@/app/utils/cardIcons";

export default function CardSelectionPage() {
  const { state, setTableNumber, loadTableData } = useTable();
  const { navigateWithTable, tableNumber } = useTableNavigation();
  const searchParams = useSearchParams();
  const params = useParams();
  const { setParams, params: restaurantParams } = useRestaurant();
  const { hasPaymentMethods, paymentMethods, deletePaymentMethod } =
    usePayment();
  const { user, profile, isLoading: authLoading } = useAuth();

  // Tarjeta por defecto del sistema
  const defaultSystemCard = {
    id: "system-default-card",
    lastFourDigits: "1234",
    cardBrand: "amex",
    cardType: "credit",
    isDefault: true,
    isSystemCard: true,
  };

  const allPaymentMethods = [defaultSystemCard, ...paymentMethods];

  const paymentType = searchParams.get("type") || "full-bill";
  const totalAmountCharged = parseFloat(searchParams.get("amount") || "0");
  const baseAmount = parseFloat(searchParams.get("baseAmount") || "0");
  const tipAmount = parseFloat(searchParams.get("tipAmount") || "0");
  const ivaTip = parseFloat(searchParams.get("ivaTip") || "0");
  const xquisitoCommissionClient = parseFloat(
    searchParams.get("xquisitoCommissionClient") || "0"
  );
  const ivaXquisitoClient = parseFloat(
    searchParams.get("ivaXquisitoClient") || "0"
  );
  const xquisitoCommissionRestaurant = parseFloat(
    searchParams.get("xquisitoCommissionRestaurant") || "0"
  );
  const xquisitoCommissionTotal = parseFloat(
    searchParams.get("xquisitoCommissionTotal") || "0"
  );
  const selectedItemsParam = searchParams.get("selectedItems");

  const xquisitoClientCharge = xquisitoCommissionClient + ivaXquisitoClient;
  const ivaXquisitoRestaurant = xquisitoCommissionRestaurant * 0.16;
  const xquisitoRestaurantCharge =
    xquisitoCommissionRestaurant + ivaXquisitoRestaurant;
  const subtotalForCommission = baseAmount + tipAmount;
  const xquisitoRateApplied =
    subtotalForCommission > 0
      ? (xquisitoCommissionTotal / subtotalForCommission) * 100
      : 0;

  const {
    createCheckout,
    isLoading: paymentLoading,
    error: paymentError,
    waitForSDK,
  } = useEcartPay();

  const effectiveName =
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.firstName || "") || "";

  const [name, setName] = useState(effectiveName);
  const [email, setEmail] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("mastercard");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [paymentMethodType, setPaymentMethodType] = useState<"saved" | "new">(
    "new"
  );
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedMSI, setSelectedMSI] = useState<number | null>(null);

  // Establecer restaurantId y branchNumber desde los path params
  useEffect(() => {
    const restaurantId = params?.restaurantId as string;
    const branchNumber = params?.branchNumber as string;

    if (restaurantId && branchNumber) {
      setParams({
        restaurantId,
        branchNumber,
      });
    }
  }, [params, setParams]);

  // Establecer el número de mesa desde los query params
  useEffect(() => {
    const tableParam = searchParams.get("table");
    if (tableParam && tableParam !== state.tableNumber) {
      setTableNumber(tableParam);
    }
  }, [searchParams, setTableNumber, state.tableNumber]);

  useEffect(() => {
    const newName =
      (profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile?.firstName || "") || "";
    if (newName && newName !== name) {
      setName(newName);
    }

    if (paymentType === "select-items" && selectedItemsParam) {
      setSelectedItems(
        selectedItemsParam.split(",").filter((item) => item.trim() !== "")
      );
    }
  }, [profile, paymentType, selectedItemsParam]);

  // Cargar datos de la mesa
  useEffect(() => {
    const loadData = async () => {
      if (!tableNumber) {
        console.log("⚠️ Card selection: Waiting for tableNumber...");
        return;
      }

      if (!restaurantParams?.restaurantId || !restaurantParams?.branchNumber) {
        console.log("⚠️ Card selection: Waiting for restaurant params...");
        return;
      }

      if (!state.order) {
        console.log("🔄 Card selection: Loading table data (no order)");
        await loadTableData();
      } else if (state.order?.order_id) {
        if (!state.order.items || state.order.items.length === 0) {
          console.log("🔄 Card selection: Loading table data (missing data)");
          await loadTableData();
        } else {
          console.log("✅ Card selection: Data already loaded");
        }
      }
    };
    loadData();
  }, [tableNumber, state.order, restaurantParams]);

  const dishes = state.order?.items || [];
  const unpaidDishes = dishes.filter(
    (dish) => dish.payment_status === "not_paid" || !dish.payment_status
  );

  useEffect(() => {
    if (!selectedPaymentMethodId && allPaymentMethods.length > 0) {
      const defaultMethod =
        allPaymentMethods.find((pm) => pm.isDefault) || allPaymentMethods[0];
      setSelectedPaymentMethodId(defaultMethod.id);
      console.log("💳 Auto-seleccionando tarjeta:", defaultMethod.id);
    }
    setPaymentMethodType("saved");
    setIsLoadingInitial(false);
  }, [allPaymentMethods.length]);

  const handlePaymentSuccess = async (
    paymentId: string,
    amount: number,
    paymentType: string
  ): Promise<void> => {
    try {
      setIsProcessing(true);
      setIsAnimatingOut(true);

      const realPaymentMethodId =
        selectedPaymentMethodId === "system-default-card"
          ? null
          : selectedPaymentMethodId;

      if (paymentType === "select-items") {
        await paymentService.paySelectedDishes(
          selectedItems,
          realPaymentMethodId
        );
      } else if (paymentType === "equal-shares") {
        await paymentService.paySplitAmount({
          orderId: state.order?.order_id!,
          userId: user?.id,
          guestName: !user?.id ? name.trim() : null,
          paymentMethodId: realPaymentMethodId,
        });
      } else if (
        paymentType === "full-bill" ||
        paymentType === "choose-amount"
      ) {
        await paymentService.payOrderAmount({
          orderId: state.order?.order_id!,
          amount: baseAmount,
          userId: user?.id,
          guestName: !user?.id ? name.trim() : null,
          paymentMethodId: realPaymentMethodId,
        });
      }

      const backgroundOperations = async () => {
        try {
          console.log("🔄 Reloading table data after payment (background)...");
          await loadTableData();

          console.log("📊 Recording payment transaction (background)");

          const transactionPaymentMethodId =
            selectedPaymentMethodId === "system-default-card"
              ? null
              : selectedPaymentMethodId;

          await paymentService.recordPaymentTransaction({
            payment_method_id: transactionPaymentMethodId,
            restaurant_id: parseInt(restaurantParams?.restaurantId!),
            id_table_order: null,
            id_tap_orders_and_pay: state.order?.order_id || null,
            base_amount: baseAmount,
            tip_amount: tipAmount,
            iva_tip: ivaTip,
            xquisito_commission_total: xquisitoCommissionTotal,
            xquisito_commission_client: xquisitoCommissionClient,
            xquisito_commission_restaurant: xquisitoCommissionRestaurant,
            iva_xquisito_client: ivaXquisitoClient,
            iva_xquisito_restaurant: ivaXquisitoRestaurant,
            xquisito_client_charge: xquisitoClientCharge,
            xquisito_restaurant_charge: xquisitoRestaurantCharge,
            xquisito_rate_applied: xquisitoRateApplied,
            total_amount_charged: totalAmountCharged,
            subtotal_for_commission: subtotalForCommission,
            currency: "MXN",
          });
          console.log(
            "✅ Payment transaction recorded successfully (background)"
          );
        } catch (transactionError) {
          console.error("❌ Error in background operations:", transactionError);
        }
      };

      backgroundOperations();

      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowPaymentAnimation(true);
      setIsAnimatingOut(false);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      setShowPaymentAnimation(false);

      navigateWithTable("/order");
    } catch (error) {
      console.error("❌ Error in handlePaymentSuccess:", error);
      setIsProcessing(false);
      setIsAnimatingOut(false);
      alert("Error al procesar el pago. Por favor intenta de nuevo.");
    }
  };

  const handlePayment = async () => {
    if (isProcessing) return;

    console.log("💳 Iniciando proceso de pago...");

    if (paymentMethodType === "new") {
      if (!name.trim()) {
        alert("Por favor ingresa tu nombre");
        return;
      }
      setIsProcessing(true);

      try {
        await waitForSDK();

        await createCheckout({
          cardType: selectedPayment,
          amount: totalAmountCharged,
          baseAmount: baseAmount,
          tipAmount: tipAmount,
          paymentType: paymentType,
          onSuccess: handlePaymentSuccess,
          onError: (error: any) => {
            console.error("Error en el pago:", error);
            setIsProcessing(false);
            alert("Error al procesar el pago. Por favor intenta de nuevo.");
          },
          customerInfo: {
            name: name.trim(),
            email: email.trim() || undefined,
          },
          saveCard: false,
          msi: selectedMSI || undefined,
        });
      } catch (error) {
        console.error("Error al iniciar checkout:", error);
        setIsProcessing(false);
        alert("Error al iniciar el proceso de pago.");
      }
    } else {
      if (!selectedPaymentMethodId) {
        alert("Por favor selecciona un método de pago");
        return;
      }

      setIsProcessing(true);

      try {
        const mockPaymentId = `mock-payment-${Date.now()}`;
        await handlePaymentSuccess(
          mockPaymentId,
          totalAmountCharged,
          paymentType
        );
      } catch (error) {
        console.error("Error al procesar pago con tarjeta guardada:", error);
        setIsProcessing(false);
        alert("Error al procesar el pago. Por favor intenta de nuevo.");
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este método de pago? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setDeletingCardId(cardId);
    try {
      await deletePaymentMethod(cardId);
      if (selectedPaymentMethodId === cardId) {
        setSelectedPaymentMethodId(null);
      }
    } catch (error) {
      console.error("Error al eliminar tarjeta:", error);
      alert("Error al eliminar el método de pago");
    } finally {
      setDeletingCardId(null);
    }
  };

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-800 mb-4 md:mb-6">
            Mesa Inválida
          </h1>
          <p className="text-gray-600 text-base md:text-lg lg:text-xl">
            Por favor escanee el código QR
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingInitial || authLoading) {
    return (
      <div className="min-h-dvh bg-linear-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <div
          className="fixed top-0 left-0 right-0 z-50"
          style={{ zIndex: 999 }}
        >
          <MenuHeaderBack />
        </div>
        <div className="h-20"></div>
        <div className="w-full flex-1 flex items-center justify-center">
          <Loader2 className="size-10 text-white animate-spin" />
        </div>
      </div>
    );
  }

  /*
  if (showPaymentAnimation) {
    return (
      <PaymentAnimation onComplete={() => setShowPaymentAnimation(false)} />
    );
  }*/

  const isPayButtonDisabled =
    isProcessing ||
    (paymentMethodType === "new" && !name.trim()) ||
    (paymentMethodType === "saved" && !selectedPaymentMethodId) ||
    totalAmountCharged <= 0;

  return (
    <div
      className={`min-h-dvh bg-linear-to-br from-[#0a8b9b] to-[#153f43] flex flex-col transition-opacity duration-300 ${
        isAnimatingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="fixed top-0 left-0 right-0 z-50" style={{ zIndex: 999 }}>
        <MenuHeaderBack />
      </div>
      <div className="h-20"></div>

      <div className="w-full flex-1 flex flex-col justify-end">
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
          <div className="flex flex-col relative px-4 md:px-6 lg:px-8 w-full">
            <div className="left-4 right-4 bg-linear-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
              <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center">
                <h1 className="text-[#e0e0e0] text-xl md:text-2xl lg:text-3xl font-medium">
                  Mesa {tableNumber}
                </h1>
                <h1 className="font-medium text-white text-3xl md:text-4xl lg:text-5xl leading-7 md:leading-9 lg:leading-tight mt-2 md:mt-3 mb-6 md:mb-8">
                  Método de pago
                </h1>
              </div>
            </div>

            <div className="bg-white rounded-t-4xl relative z-10 flex flex-col pt-8 md:pt-10 lg:pt-12 pb-4 md:pb-6">
              <div className="space-y-6 md:space-y-8 px-8 md:px-10 lg:px-12">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setPaymentMethodType("saved")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      paymentMethodType === "saved"
                        ? "text-teal-600 border-b-2 border-teal-600"
                        : "text-gray-500"
                    }`}
                  >
                    Tarjetas guardadas
                  </button>
                  <button
                    onClick={() => setPaymentMethodType("new")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      paymentMethodType === "new"
                        ? "text-teal-600 border-b-2 border-teal-600"
                        : "text-gray-500"
                    }`}
                  >
                    Nueva tarjeta
                  </button>
                </div>

                {/* Saved Cards */}
                {paymentMethodType === "saved" && (
                  <div className="space-y-3">
                    {allPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethodId === method.id
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10">
                            {getCardTypeIcon(method.cardBrand)}
                          </div>
                          <div>
                            <p className="text-black font-medium">
                              •••• {method.lastFourDigits}
                            </p>
                            <p className="text-sm text-gray-500 capitalize">
                              {method.cardType}
                              {method.isSystemCard && " (Sistema)"}
                            </p>
                          </div>
                        </div>
                        {!method.isSystemCard && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(method.id);
                            }}
                            disabled={deletingCardId === method.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            {deletingCardId === method.id ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <Trash2 className="size-5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* New Card */}
                {paymentMethodType === "new" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre en la tarjeta *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre completo"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (opcional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de tarjeta
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {["visa", "mastercard", "amex"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setSelectedPayment(type)}
                            className={`p-4 border-2 rounded-lg transition-colors ${
                              selectedPayment === type
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="size-12 mx-auto">
                              {getCardTypeIcon(type)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="w-full flex gap-3 justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-sm md:text-base">
                        Total a pagar
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl md:text-3xl font-medium text-black">
                          ${totalAmountCharged.toFixed(2)}
                        </span>
                        <CircleAlert
                          className="size-4 cursor-pointer text-gray-500"
                          strokeWidth={2.3}
                          onClick={() => setShowTotalModal(true)}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={isPayButtonDisabled}
                      className={`rounded-full px-16 h-12 flex items-center justify-center text-lg transition-all bg-linear-to-r from-[#34808C] to-[#173E44] text-white ${
                        isPayButtonDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "animate-pulse-button active:scale-90 cursor-pointer"
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        "Pagar"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de resumen del total */}
      {showTotalModal && (
        <div
          className="fixed inset-0 flex items-end justify-center backdrop-blur-sm"
          style={{ zIndex: 99999 }}
        >
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowTotalModal(false)}
          ></div>

          <div className="relative bg-white rounded-t-4xl w-full mx-4 md:mx-6 lg:mx-8">
            <div className="px-6 pt-4 md:px-8 lg:px-10 md:pt-6 lg:pt-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-black">
                  Resumen del total
                </h3>
                <button
                  onClick={() => setShowTotalModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 md:px-8 lg:px-10 md:py-6 lg:py-8">
              <p className="text-black mb-4 text-base md:text-lg">
                El total se obtiene de la suma de:
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">+ Consumo</span>
                  <span className="text-black font-medium">
                    ${baseAmount.toFixed(2)} MXN
                  </span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Propina</span>
                    <span className="text-black font-medium">
                      ${tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">
                    + Comisión de servicio
                  </span>
                  <span className="text-black font-medium">
                    ${xquisitoClientCharge.toFixed(2)} MXN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
