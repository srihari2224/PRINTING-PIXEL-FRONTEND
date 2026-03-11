"use client"

import { useState } from "react"
import { ArrowLeft, FileText, Printer, Copy, ChevronDown, ChevronUp, Layers } from "lucide-react"
import styles from "./ReviewPage.module.css"

interface ReviewPageProps {
  uploadResult: any
  kioskId: string
  onBack: () => void
  onProceedToPayment: (totalAmount: number) => void
  isDark?: boolean
}

function expandPageRange(range: string, maxPages: number): number[] {
  if (!range || range.trim().toLowerCase() === 'all') {
    return Array.from({ length: maxPages }, (_, i) => i + 1)
  }
  const pages = new Set<number>()
  const parts = range.split(',').map(p => p.trim())
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()))
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i > 0 && i <= maxPages) pages.add(i)
        }
      }
    } else {
      const num = parseInt(part)
      if (!isNaN(num) && num > 0 && num <= maxPages) pages.add(num)
    }
  }
  return Array.from(pages).sort((a, b) => a - b)
}

function calculatePrice(pages: number, colorMode: string, duplex: string, copies: number): number {
  let totalPerCopy = 0
  if (colorMode === 'color') {
    totalPerCopy = pages * 10
  } else {
    if (duplex === 'single') {
      totalPerCopy = pages * 2
    } else {
      const fullSheets = Math.floor(pages / 2)
      const extraSheet = pages % 2
      totalPerCopy = (fullSheets * 3) + (extraSheet * 2)
    }
  }
  return totalPerCopy * copies
}

export default function ReviewPage({ uploadResult, kioskId, onBack, onProceedToPayment, isDark = true }: ReviewPageProps) {
  const [showBillDetails, setShowBillDetails] = useState(false)

  const calculateTotalAmount = () => {
    let total = 0
    let totalPagesCount = 0
    uploadResult.files.forEach((file: any) => {
      const pageRange = file.printOptions.pageRange || 'all'
      const actualPages = expandPageRange(pageRange, file.pageCount).length
      const price = calculatePrice(actualPages, file.printOptions.colorMode, file.printOptions.duplex, file.printOptions.copies)
      total += price
      totalPagesCount += actualPages * file.printOptions.copies
    })
    return { total, totalPagesCount }
  }

  const { total: totalAmount, totalPagesCount } = calculateTotalAmount()

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className={styles.headerTitle}>REVIEW ORDER</h1>
        <div className={styles.headerSpacer} />
      </div>

      {/* Scrollable content */}
      <div className={styles.content}>

        {/* ── Files Section ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>01.</span>
            <h2 className={styles.sectionTitle}>PRINT JOBS</h2>
            <button className={styles.editButton} onClick={onBack}>
              EDIT
            </button>
          </div>

          <div className={styles.filesList}>
            {uploadResult.files.map((file: any, index: number) => {
              const pageRange = file.printOptions.pageRange || 'all'
              const expandedPages = expandPageRange(pageRange, file.pageCount)
              const actualPages = expandedPages.length
              const filePrice = calculatePrice(actualPages, file.printOptions.colorMode, file.printOptions.duplex, file.printOptions.copies)

              return (
                <div key={index} className={styles.fileCard}>
                  {/* Icon */}
                  <div className={styles.fileIcon}>
                    <FileText size={20} strokeWidth={1.5} />
                  </div>

                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{file.originalName}</div>
                    <div className={styles.fileDetails}>
                      {pageRange.toLowerCase() === 'all'
                        ? `All ${file.pageCount} pages`
                        : `Pages: ${pageRange} (${actualPages})`
                      }
                    </div>
                    <div className={styles.fileOptions}>
                      <span className={styles.badge}>
                        <Copy size={10} strokeWidth={2} />
                        {file.printOptions.copies}x
                      </span>
                      <span className={styles.badge}>
                        {file.printOptions.colorMode === 'color' ? 'Color' : 'B&W'}
                      </span>
                      <span className={styles.badge}>
                        <Printer size={10} strokeWidth={2} />
                        {file.printOptions.duplex === 'double' ? 'Double' : 'Single'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.filePrice}>₹{filePrice}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Kiosk Info ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>02.</span>
            <h2 className={styles.sectionTitle}>KIOSK</h2>
          </div>

          <div className={styles.kioskCard}>
            <div className={styles.kioskIconBox}>
              <Printer size={22} strokeWidth={1.5} />
            </div>
            <div className={styles.kioskInfo}>
              <div className={styles.kioskName}>
                {kioskId}
                <span className={styles.statusBadge}>READY</span>
              </div>
              <div className={styles.kioskSub}>Print Kiosk · Open now</div>
            </div>
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>03.</span>
            <h2 className={styles.sectionTitle}>SUMMARY</h2>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.billHeader} onClick={() => setShowBillDetails(!showBillDetails)}>
              <h3>BILL DETAILS</h3>
              {showBillDetails ? <ChevronUp size={18} strokeWidth={2} /> : <ChevronDown size={18} strokeWidth={2} />}
            </div>

            {showBillDetails && (
              <div className={styles.billDetails}>
                <div className={styles.billRow}>
                  <span>Total Files</span>
                  <span>{uploadResult.files.length} File{uploadResult.files.length > 1 ? 's' : ''}</span>
                </div>
                <div className={styles.billRow}>
                  <span>Total Pages</span>
                  <span>{totalPagesCount} Page{totalPagesCount > 1 ? 's' : ''}</span>
                </div>
                <div className={styles.billRow}>
                  <span>Print Cost</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className={styles.billRow}>
                  <span>Handling</span>
                  <span className={styles.freeTag}>FREE</span>
                </div>
              </div>
            )}

            <div className={styles.grandTotal}>
              <span>GRAND TOTAL</span>
              <span className={styles.grandTotalAmount}>₹{totalAmount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Footer */}
      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          <p className={styles.footerPages}>{totalPagesCount} pages</p>
          <h3 className={styles.footerAmount}>₹{totalAmount}</h3>
        </div>
        <button className={styles.proceedButton} onClick={() => onProceedToPayment(totalAmount)}>
          PROCEED TO PAY
        </button>
      </div>
    </div>
  )
}