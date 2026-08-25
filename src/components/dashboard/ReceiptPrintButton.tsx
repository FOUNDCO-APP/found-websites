"use client"

import { GREEN } from "@/lib/dashboard/typography"

export default function ReceiptPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        width: "100%",
        minHeight: 48,
        marginTop: 18,
        borderRadius: 999,
        border: `1px solid ${GREEN}`,
        backgroundColor: GREEN,
        color: "#080A09",
        fontSize: 15,
        fontWeight: 850,
        cursor: "pointer",
      }}
    >
      Print or save PDF
    </button>
  )
}
