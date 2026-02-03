"use client"

import { useState } from "react"
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import styles from "./ReviewPage.module.css"

interface ReviewPageProps {
  uploadResult: any
  kioskId: string
  onBack: () => void
  onProceedToPayment: (totalAmount: number) => void
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
      if (!isNaN(num) && num > 0 && num <= maxPages) {
        pages.add(num)
      }
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

export default function ReviewPage({ 
  uploadResult, 
  kioskId,
  onBack,
  onProceedToPayment 
}: ReviewPageProps) {
  const [showBillDetails, setShowBillDetails] = useState(false)

  const calculateTotalAmount = () => {
    let total = 0
    let totalPagesCount = 0

    uploadResult.files.forEach((file: any) => {
      const pageRange = file.printOptions.pageRange || 'all'
      const actualPages = expandPageRange(pageRange, file.pageCount).length
      const price = calculatePrice(
        actualPages,
        file.printOptions.colorMode,
        file.printOptions.duplex,
        file.printOptions.copies
      )
      total += price
      totalPagesCount += actualPages * file.printOptions.copies
    })

    return { total, totalPagesCount }
  }

  const { total: totalAmount, totalPagesCount } = calculateTotalAmount()

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.headerTitle}>REVIEW ORDER</h1>
        <div className={styles.headerSpacer} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Uploaded Files */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>UPLOADED FILES</h2>
            <button className={styles.editButton} onClick={onBack}>
              ✏️ EDIT
            </button>
          </div>

          <div className={styles.filesList}>
            {uploadResult.files.map((file: any, index: number) => {
              const pageRange = file.printOptions.pageRange || 'all'
              const expandedPages = expandPageRange(pageRange, file.pageCount)
              const actualPages = expandedPages.length
              const filePrice = calculatePrice(
                actualPages,
                file.printOptions.colorMode,
                file.printOptions.duplex,
                file.printOptions.copies
              )

              return (
                <div key={index} className={styles.fileCard}>
                  <div className={styles.fileIcon}>
                    📄
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
                      <span className={styles.badge}>{file.printOptions.copies}× Copy</span>
                      <span className={styles.badge}>
                        {file.printOptions.colorMode === 'color' ? '🎨 Color' : '⚫ B&W'}
                      </span>
                      <span className={styles.badge}>
                        {file.printOptions.duplex === 'double' ? '📑 Double' : '📄 Single'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.filePrice}>
                    ₹{filePrice}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Personal & Shop Details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>PERSONAL & SHOP DETAILS</h2>

          <div className={styles.detailCard}>
            <div className={styles.phoneRow}>
              <span>📱</span>
              <span className={styles.phoneNumber}>+91 89190 22539</span>
              <button className={styles.editIcon}>✏️</button>
            </div>
          </div>

          <div className={styles.detailCard}>
            <div className={styles.kioskRow}>
              <div className={styles.kioskIcon}>
                🖨️
              </div>
              <div className={styles.kioskInfo}>
                <div className={styles.kioskName}>
                  {kioskId}
                  <span className={styles.statusBadge}>OPEN</span>
                </div>
                <div className={styles.kioskLocation}>DACE</div>
                <div className={styles.kioskHours}>Open until 10PM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>ORDER SUMMARY</h2>

          <div className={styles.summaryCard}>
            <div 
              className={styles.billHeader}
              onClick={() => setShowBillDetails(!showBillDetails)}
            >
              <h3>BILL DETAILS</h3>
              {showBillDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                  <span>Handling Charges</span>
                  <span className={styles.freeTag}>FREE</span>
                </div>
              </div>
            )}

            <div className={styles.grandTotal}>
              <span>GRAND TOTAL</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          <p>{totalPagesCount} pages</p>
          <h3>₹{totalAmount}</h3>
        </div>
        <button 
          className={styles.proceedButton}
          onClick={() => onProceedToPayment(totalAmount)}
        >
          PROCEED TO PAY
        </button>
      </div>
    </div>
  )
}