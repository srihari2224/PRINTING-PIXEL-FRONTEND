"use client"

import { useState, useEffect } from "react"
import { X, ShoppingBag, Plus, Minus, Printer, ChevronRight, ShieldCheck, Package } from "lucide-react"
import styles from "./PaperShop.module.css"
import OTPPage from "./OTPPage"
import { generateInvoicePDF } from "../utils/generateInvoicePDF"

/* ── Shop catalogue (mirrors backend) ── */
const SHOP_ITEMS = [
    {
        id: "a4_sheet",
        name: "A4 Sheet",
        subtitle: "Plain white A4",
        icon: "📄",
        badges: ["Color", "Single-Side"],
        pricePerItem: 10,
        colorMode: "color",
        duplex: "single",
    },
    {
        id: "graph_sheet",
        name: "Graph Sheet",
        subtitle: "A4 Graph Paper",
        icon: "📐",
        badges: ["Color", "Single-Side"],
        pricePerItem: 10,
        colorMode: "color",
        duplex: "single",
    },
    {
        id: "margin_lined",
        name: "Margin Lined",
        subtitle: "Ruled with margin",
        icon: "📝",
        badges: ["B&W", "Double-Side"],
        pricePerItem: 2,
        colorMode: "bw",
        duplex: "double",
    },
]

interface CartItem {
    itemId: string
    qty: number
    name: string
    pricePerItem: number
}

interface PaperShopProps {
    kioskId: string
    isDark?: boolean
    onClose: () => void
    onPaymentSuccess: (otp: string, queue: CartItem[]) => void
}

declare global {
    interface Window {
        Razorpay?: any
    }
}

const loadRazorpay = () =>
    new Promise<boolean>((resolve, reject) => {
        if (window.Razorpay) return resolve(true)
        const s = document.createElement("script")
        s.src = "https://checkout.razorpay.com/v1/checkout.js"
        s.onload = () => resolve(true)
        s.onerror = () => reject(false)
        document.body.appendChild(s)
    })

export default function PaperShop({ kioskId, isDark = true, onClose, onPaymentSuccess }: PaperShopProps) {
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({
        a4_sheet: 0,
        graph_sheet: 0,
        margin_lined: 0,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [visible, setVisible] = useState(false)

    // Slide-up animation
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(t)
    }, [])

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 320)
    }

    const cartItems: CartItem[] = SHOP_ITEMS.filter((item) => quantities[item.id] > 0).map((item) => ({
        itemId: item.id,
        qty: quantities[item.id],
        name: item.name,
        pricePerItem: item.pricePerItem,
    }))

    const totalAmount = cartItems.reduce((sum, item) => sum + item.qty * item.pricePerItem, 0)

    const changeQty = (itemId: string, delta: number) => {
        setQuantities((prev) => ({
            ...prev,
            [itemId]: Math.max(0, (prev[itemId] || 0) + delta),
        }))
    }

    const handlePay = async () => {
        if (cartItems.length === 0) {
            setError("Please add at least one item to proceed")
            return
        }
        setError("")
        setLoading(true)
        try {
            // 1. Create order on backend
            const checkoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shop/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kioskId,
                    items: cartItems.map(({ itemId, qty }) => ({ itemId, qty })),
                    amountInPaise: totalAmount * 100,
                }),
            })
            if (!checkoutRes.ok) {
                const errData = await checkoutRes.json()
                throw new Error(errData.error || "Checkout failed")
            }
            const { uploadId, orderId, amount, currency } = await checkoutRes.json()

            // 2. Open Razorpay
            await loadRazorpay()
            const options: any = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount,
                currency,
                order_id: orderId,
                name: "PRINTIT Paper Shop",
                description: `Paper Shop — ${kioskId}`,
                handler: async (response: any) => {
                    try {
                        const confirmRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shop/confirm-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                uploadId,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount,
                                currency,
                                customerPhone: response.contact || "",
                                customerEmail: response.email || "",
                                paymentMethod: response.method || "unknown",
                            }),
                        })
                        if (!confirmRes.ok) throw new Error("Payment confirmation failed")
                        const { otp } = await confirmRes.json()

                        // Generate invoice
                        try {
                            const shopQueue = cartItems.map((c) => ({
                                id: Date.now(),
                                fileName: c.name,
                                cost: c.qty * c.pricePerItem,
                                copies: c.qty,
                                type: "pdf",
                            }))
                            await generateInvoicePDF({
                                otp,
                                kioskId,
                                queue: shopQueue,
                                totalAmount,
                                customerPhone: response.contact || "",
                            })
                        } catch (e) {
                            console.error("Invoice error:", e)
                        }

                        onPaymentSuccess(otp, cartItems)
                    } catch (err: any) {
                        setError(err?.message || "Payment confirmation failed")
                    } finally {
                        setLoading(false)
                    }
                },
                prefill: { name: "Customer", email: "", contact: "" },
                theme: { color: "#ff6b47" },
                modal: {
                    ondismiss: () => setLoading(false),
                },
            }
            const rzp = new window.Razorpay(options)
            rzp.on("payment.failed", (r: any) => {
                setError(`Payment failed: ${r.error.description || "Unknown error"}`)
                setLoading(false)
            })
            rzp.open()
        } catch (err: any) {
            setError(err?.message || "Something went wrong")
            setLoading(false)
        }
    }

    return (
        <div className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`} onClick={handleClose}>
            <div
                className={`${styles.sheet} ${isDark ? styles.dark : styles.light} ${visible ? styles.sheetVisible : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Handle bar */}
                <div className={styles.handle} />

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <ShoppingBag size={18} strokeWidth={2} className={styles.headerIcon} />
                        <div>
                            <h2 className={styles.headerTitle}>PAPER SHOP</h2>
                            <p className={styles.headerSub}>Pre-printed stationery · instant</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className={styles.body}>
                    {/* Queue section */}
                    {cartItems.length > 0 && (
                        <div className={styles.queueSection}>
                            <div className={styles.queueLabel}>
                                <Printer size={12} strokeWidth={2.5} />
                                <span>QUEUE</span>
                                <span className={styles.queueBadge}>{cartItems.reduce((s, c) => s + c.qty, 0)}</span>
                            </div>
                            <div className={styles.queueList}>
                                {cartItems.map((item) => (
                                    <div key={item.itemId} className={styles.queueCard}>
                                        <div className={styles.queueCardTop}>
                                            <Package size={14} strokeWidth={1.5} />
                                        </div>
                                        <div className={styles.queueCardFooter}>
                                            <div className={styles.queueTitle}>{item.name.split(" ")[0]}</div>
                                            <div className={styles.queueSub}>×{item.qty}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div className={styles.itemsSection}>
                        <div className={styles.sectionLabel}>
                            <span className={styles.sectionNum}>01.</span>
                            <span className={styles.sectionTitle}>ITEMS</span>
                        </div>
                        <div className={styles.itemsRow}>
                            {SHOP_ITEMS.map((item) => {
                                const qty = quantities[item.id] || 0
                                return (
                                    <div key={item.id} className={`${styles.itemCard} ${qty > 0 ? styles.itemCardActive : ""}`}>
                                        {/* Icon */}
                                        <div className={styles.itemIconWrap}>
                                            <span className={styles.itemEmoji}>{item.icon}</span>
                                        </div>

                                        {/* Info */}
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{item.name}</div>
                                            <div className={styles.itemSub}>{item.subtitle}</div>
                                            <div className={styles.itemBadges}>
                                                {item.badges.map((b) => (
                                                    <span key={b} className={styles.badge}>{b}</span>
                                                ))}
                                            </div>
                                            <div className={styles.itemPrice}>₹{item.pricePerItem}<span className={styles.itemPriceSub}>/copy</span></div>
                                        </div>

                                        {/* Qty control */}
                                        <div className={styles.qtyControl}>
                                            <button
                                                className={styles.qtyBtn}
                                                onClick={() => changeQty(item.id, -1)}
                                                disabled={qty === 0}
                                                aria-label="Decrease"
                                            >
                                                <Minus size={14} strokeWidth={2.5} />
                                            </button>
                                            <span className={styles.qtyNum}>{qty}</span>
                                            <button
                                                className={styles.qtyBtnPlus}
                                                onClick={() => changeQty(item.id, 1)}
                                                aria-label="Increase"
                                            >
                                                <Plus size={14} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Error */}
                    {error && <div className={styles.errorMsg}>{error}</div>}
                </div>

                {/* Fixed footer */}
                <div className={styles.footer}>
                    <div className={styles.footerLeft}>
                        <span className={styles.footerLabel}>TOTAL</span>
                        <span className={styles.footerAmount}>₹{totalAmount}</span>
                    </div>
                    <button
                        className={styles.payBtn}
                        onClick={handlePay}
                        disabled={loading || cartItems.length === 0}
                    >
                        {loading ? (
                            <span className={styles.loadingDots}>
                                <span />
                                <span />
                                <span />
                            </span>
                        ) : (
                            <>
                                <ShieldCheck size={16} strokeWidth={2} />
                                <span>PAY NOW</span>
                                <ChevronRight size={16} strokeWidth={2.5} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
