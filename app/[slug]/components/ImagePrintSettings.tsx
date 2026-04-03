"use client"

import { useState, useEffect } from "react"
import { X, Plus, ArrowLeft, RotateCw } from "lucide-react"
import styles from "./ImagePrintSettings.module.css"

interface ImageFile {
  name: string
  url: string
  file: File
}

interface Layout {
  id: string
  columns: number
  rows: number
  imageCount: number
  previewGrid: string
}

interface ImagePrintSettingsProps {
  images: ImageFile[]
  onClose: () => void
  onAddToQueue: (printJob: any) => void
}

const LAYOUTS: Layout[] = [
  { id: "1x1", columns: 1, rows: 1, imageCount: 1, previewGrid: "1fr" },
  { id: "1x2", columns: 1, rows: 2, imageCount: 2, previewGrid: "1fr" },
  { id: "2x2", columns: 2, rows: 2, imageCount: 4, previewGrid: "repeat(2, 1fr)" },
  { id: "3x3", columns: 3, rows: 3, imageCount: 9, previewGrid: "repeat(3, 1fr)" },
]

export default function ImagePrintSettings({ images, onClose, onAddToQueue }: ImagePrintSettingsProps) {
  const [selectedLayout, setSelectedLayout] = useState<Layout>(LAYOUTS[0])
  const [copies, setCopies] = useState(1)
  const [colorMode, setColorMode] = useState<"color" | "bw">("color")
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>(images.slice(0, 1))
  // Per-slot rotation state (degrees: 0, 90, 180, 270)
  const [rotations, setRotations] = useState<number[]>([0])
  const [generating, setGenerating] = useState(false)
  const [jsPDFReady, setJsPDFReady] = useState(false)

  const maxImages = selectedLayout.imageCount

  useEffect(() => {
    if (typeof window === "undefined") return
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    script.async = true
    script.onload = () => {
      if ((window as any).jspdf?.jsPDF) setJsPDFReady(true)
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  useEffect(() => {
    setSelectedImages(images.slice(0, selectedLayout.imageCount))
    setRotations(images.slice(0, selectedLayout.imageCount).map(() => 0))
  }, [selectedLayout, images])

  const handleAddImage = (image: ImageFile) => {
    if (selectedImages.length < maxImages) {
      setSelectedImages([...selectedImages, image])
      setRotations([...rotations, 0])
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index))
    setRotations(rotations.filter((_, i) => i !== index))
  }

  const handleRotateImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    const next = [...rotations]
    next[index] = (next[index] + 90) % 360
    setRotations(next)
  }

  const calculatePrice = () => {
    const pricePerCopy = colorMode === "color" ? 10 : 2
    return copies * pricePerCopy
  }

  const processImage = async (imageUrl: string, applyGrayscale: boolean, rotation: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const isSwapped = rotation === 90 || rotation === 270
        const canvas = document.createElement('canvas')
        canvas.width = isSwapped ? img.height : img.width
        canvas.height = isSwapped ? img.width : img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context not available')); return }

        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.resetTransform()

        if (applyGrayscale) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            data[i] = data[i + 1] = data[i + 2] = gray
          }
          ctx.putImageData(imageData, 0, 0)
        }
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
  }

  const generatePDF = async (): Promise<Blob> => {
    try {
      const jsPDFLib = (window as any).jspdf?.jsPDF
      if (!jsPDFLib) throw new Error('jsPDF library not loaded')

      const pdf = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = 210, pageHeight = 297, margin = 10
      const availableWidth = pageWidth - 2 * margin
      const availableHeight = pageHeight - 2 * margin
      const cellWidth = availableWidth / selectedLayout.columns
      const cellHeight = availableHeight / selectedLayout.rows

      for (let i = 0; i < selectedImages.length; i++) {
        const row = Math.floor(i / selectedLayout.columns)
        const col = i % selectedLayout.columns
        const x = margin + col * cellWidth
        const y = margin + row * cellHeight
        const processedImage = await processImage(selectedImages[i].url, colorMode === "bw", rotations[i] || 0)
        const padding = 2
        pdf.addImage(processedImage, 'JPEG', x + padding, y + padding, cellWidth - 2 * padding, cellHeight - 2 * padding)
      }
      return pdf.output('blob')
    } catch (error) {
      console.error('PDF generation error:', error)
      throw error
    }
  }

  const handleAddToQueue = async () => {
    if (selectedImages.length === 0) { alert('Please add at least one image to the layout'); return }
    if (!jsPDFReady) { alert('PDF generator is still loading. Please wait a moment and try again.'); return }
    setGenerating(true)
    try {
      const pdfBlob = await generatePDF()
      const pdfFile = new File([pdfBlob], `photo-print-${selectedLayout.id}-${Date.now()}.pdf`, { type: 'application/pdf' })
      const printJob = {
        id: Date.now(), type: 'image-layout', file: pdfFile,
        fileName: pdfFile.name, fileType: 'pdf', totalPages: 1,
        printSettings: { copies, pageRange: "all" as "all" | "custom", customPages: "", doubleSided: "one-side" as "one-side" | "both-sides", colorMode },
        pagesToPrint: 1, cost: calculatePrice(),
        timestamp: new Date().toLocaleTimeString(),
        layoutInfo: { layoutName: selectedLayout.id, imageCount: selectedImages.length }
      }
      onAddToQueue(printJob)
      setGenerating(false)
      onClose()
    } catch (error) {
      setGenerating(false)
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h2>PHOTO PRINT</h2>
          <div className={styles.spacer} />
        </div>

        {/* Main Grid — Preview + Layout Column */}
        <div className={styles.mainGrid}>
          {/* Preview Area */}
          <div className={styles.previewArea}>
            <div
              className={styles.previewGrid}
              style={{
                gridTemplateColumns: selectedLayout.previewGrid,
                gridTemplateRows: selectedLayout.rows === 1 ? '1fr' : `repeat(${selectedLayout.rows}, 1fr)`,
                filter: colorMode === "bw" ? "grayscale(100%)" : "none"
              }}
            >
              {Array.from({ length: maxImages }).map((_, index) => (
                <div key={index} className={styles.imageSlot}>
                  {selectedImages[index] ? (
                    <>
                      <img
                        src={selectedImages[index].url}
                        alt={`Image ${index + 1}`}
                        className={styles.slotImage}
                        style={{ transform: `rotate(${rotations[index] || 0}deg)`, transition: 'transform 0.3s ease' }}
                      />
                      {/* Rotate button */}
                      <button
                        className={styles.rotateBtn}
                        onClick={(e) => handleRotateImage(e, index)}
                        title="Rotate 90°"
                        aria-label="Rotate image"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6" />
                          <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
                        </svg>
                      </button>
                      {/* Remove button */}
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveImage(index)}
                        title="Remove image"
                        aria-label="Remove image"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </>
                  ) : (
                    <div className={styles.emptySlot}>
                      <Plus size={18} strokeWidth={2} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Layout Column */}
          <div className={styles.layoutColumn}>
            {LAYOUTS.map((layout) => (
              <div
                key={layout.id}
                className={`${styles.layoutBox} ${selectedLayout.id === layout.id ? styles.active : ''}`}
                onClick={() => setSelectedLayout(layout)}
              >
                <div
                  className={styles.layoutGrid}
                  style={{
                    gridTemplateColumns: layout.previewGrid,
                    gridTemplateRows: layout.rows === 1 ? '1fr' : `repeat(${layout.rows}, 1fr)`
                  }}
                >
                  {Array.from({ length: layout.imageCount }).map((_, i) => (
                    <div key={i} className={styles.gridCell} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={styles.scrollContent}>
          {/* Available Images */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Available Images ({images.length})</h3>
            <div className={styles.imageGrid}>
              {images.map((image, index) => (
                <div key={index} className={styles.imageTile} onClick={() => handleAddImage(image)}>
                  <img src={image.url} alt={image.name} />
                  <div className={styles.overlay}>
                    <Plus size={20} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Row */}
          <div className={styles.controlsRow}>
            {/* Color Mode */}
            <div className={styles.control}>
              <h3 className={styles.sectionTitle}>Color Mode</h3>
              <div className={styles.colorModeButtons}>
                <button
                  className={`${styles.colorModeBtn} ${colorMode === "color" ? styles.colorModeBtnActive : ""}`}
                  onClick={() => setColorMode("color")}
                  title="Color print"
                >
                  {/* Multi-color circle */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M12 2a10 10 0 0 1 0 20" fill="#ff6b47" opacity="0.85" />
                    <path d="M12 2A10 10 0 0 0 2 12h10z" fill="#3b82f6" opacity="0.85" />
                    <path d="M2 12a10 10 0 0 0 10 10V12z" fill="#22c55e" opacity="0.85" />
                  </svg>
                  <span>Color</span>
                  <span className={styles.colorModeBtnPrice}>₹10</span>
                </button>

                <button
                  className={`${styles.colorModeBtn} ${colorMode === "bw" ? styles.colorModeBtnActive : ""}`}
                  onClick={() => setColorMode("bw")}
                  title="Black & White print"
                >
                  {/* B&W halved circle */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M12 2a10 10 0 0 1 0 20z" fill="#ffffff" />
                    <path d="M12 2A10 10 0 0 0 12 22z" fill="#111111" />
                  </svg>
                  <span>B&amp;W</span>
                  <span className={styles.colorModeBtnPrice}>₹2</span>
                </button>
              </div>
            </div>

            {/* Copies */}
            <div className={styles.control}>
              <h3 className={styles.sectionTitle}>Copies</h3>
              <div className={styles.copiesBox}>
                <button className={styles.copiesBoxBtn} onClick={() => setCopies(Math.max(1, copies - 1))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <input
                  type="number" min="1" max="99" value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button className={styles.copiesBoxBtn} onClick={() => setCopies(copies + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerCost}>
            <span className={styles.footerCostLabel}>TOTAL</span>
            <span className={styles.footerCostAmt}>₹{calculatePrice()}</span>
          </div>
          <div className={styles.footerBtns}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              className={styles.addBtn}
              onClick={handleAddToQueue}
              disabled={selectedImages.length === 0 || generating || !jsPDFReady}
            >
              {!jsPDFReady ? (
                <><div className={styles.addBtnSpinner} /><span>Loading…</span></>
              ) : generating ? (
                <><div className={styles.addBtnSpinner} /><span>Generating…</span></>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Add to Queue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}