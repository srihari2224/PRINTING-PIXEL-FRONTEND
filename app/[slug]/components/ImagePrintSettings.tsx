"use client"

import { useState, useEffect } from "react"
import { X, Plus, ArrowLeft } from "lucide-react"
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
  {
    id: "1x1",
    columns: 1,
    rows: 1,
    imageCount: 1,
    previewGrid: "1fr"
  },
  {
    id: "2x1",
    columns: 2,
    rows: 1,
    imageCount: 2,
    previewGrid: "1fr 1fr"
  },
  {
    id: "2x2",
    columns: 2,
    rows: 2,
    imageCount: 4,
    previewGrid: "repeat(2, 1fr)"
  },
  {
    id: "3x3",
    columns: 3,
    rows: 3,
    imageCount: 9,
    previewGrid: "repeat(3, 1fr)"
  }
]

export default function ImagePrintSettings({ 
  images, 
  onClose, 
  onAddToQueue 
}: ImagePrintSettingsProps) {
  const [selectedLayout, setSelectedLayout] = useState<Layout>(LAYOUTS[0])
  const [copies, setCopies] = useState(1)
  const [colorMode, setColorMode] = useState<"color" | "bw">("color")
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>(images.slice(0, 1))
  const [generating, setGenerating] = useState(false)
  const [jsPDFReady, setJsPDFReady] = useState(false)

  const maxImages = selectedLayout.imageCount

  useEffect(() => {
    if (typeof window === "undefined") return

    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    script.async = true

    script.onload = () => {
      if ((window as any).jspdf?.jsPDF) {
        setJsPDFReady(true)
      }
    }

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    setSelectedImages(images.slice(0, selectedLayout.imageCount))
  }, [selectedLayout, images])

  const handleAddImage = (image: ImageFile) => {
    if (selectedImages.length < maxImages) {
      setSelectedImages([...selectedImages, image])
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index))
  }

  const calculatePrice = () => {
    const pricePerCopy = colorMode === "color" ? 10 : 2
    return copies * pricePerCopy
  }

  const processImage = async (imageUrl: string, applyGrayscale: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0)

        if (applyGrayscale) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            data[i] = gray
            data[i + 1] = gray
            data[i + 2] = gray
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
      if (!jsPDFLib) {
        throw new Error('jsPDF library not loaded')
      }
      
      const pdf = new jsPDFLib({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = 210
      const pageHeight = 297
      const margin = 10

      const availableWidth = pageWidth - (2 * margin)
      const availableHeight = pageHeight - (2 * margin)
      
      const cellWidth = availableWidth / selectedLayout.columns
      const cellHeight = availableHeight / selectedLayout.rows

      for (let i = 0; i < selectedImages.length; i++) {
        const row = Math.floor(i / selectedLayout.columns)
        const col = i % selectedLayout.columns
        
        const x = margin + (col * cellWidth)
        const y = margin + (row * cellHeight)

        const processedImage = await processImage(
          selectedImages[i].url,
          colorMode === "bw"
        )

        const padding = 2
        pdf.addImage(
          processedImage,
          'JPEG',
          x + padding,
          y + padding,
          cellWidth - (2 * padding),
          cellHeight - (2 * padding)
        )
      }

      const pdfBlob = pdf.output('blob')
      return pdfBlob

    } catch (error) {
      console.error('PDF generation error:', error)
      throw error
    }
  }

  const handleAddToQueue = async () => {
    if (selectedImages.length === 0) {
      alert('Please add at least one image to the layout')
      return
    }

    if (!jsPDFReady) {
      alert('PDF generator is still loading. Please wait a moment and try again.')
      return
    }

    setGenerating(true)

    try {
      const pdfBlob = await generatePDF()
      
      const pdfFile = new File(
        [pdfBlob], 
        `photo-print-${selectedLayout.id}-${Date.now()}.pdf`,
        { type: 'application/pdf' }
      )

      const printJob = {
        id: Date.now(),
        type: 'pdf',
        file: pdfFile,
        fileName: pdfFile.name,
        fileType: 'pdf',
        totalPages: 1,
        printSettings: {
          copies: copies,
          pageRange: "all" as "all" | "custom",
          customPages: "",
          doubleSided: "one-side" as "one-side" | "both-sides",
          colorMode: colorMode
        },
        pagesToPrint: 1,
        cost: calculatePrice(),
        timestamp: new Date().toLocaleTimeString(),
        layoutInfo: {
          layoutName: selectedLayout.id,
          imageCount: selectedImages.length
        }
      }

      onAddToQueue(printJob)
      setGenerating(false)
      onClose()
      
    } catch (error) {
      console.error('Error in handleAddToQueue:', error)
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
            <ArrowLeft size={24} />
          </button>
          <h2>PHOTO PRINT</h2>
          <div className={styles.spacer} />
        </div>

        {/* Main Grid - Preview + Layout Column */}
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
                      />
                      <button 
                        className={styles.removeBtn}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className={styles.emptySlot}>
                      <Plus size={20} />
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
                <div 
                  key={index} 
                  className={styles.imageTile}
                  onClick={() => handleAddImage(image)}
                >
                  <img src={image.url} alt={image.name} />
                  <div className={styles.overlay}>
                    <Plus size={24} />
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
              <div className={styles.radioButtons}>
                <label className={`${styles.radio} ${colorMode === "color" ? styles.active : ""}`}>
                  <input 
                    type="radio" 
                    name="colorMode" 
                    value="color"
                    checked={colorMode === "color"}
                    onChange={() => setColorMode("color")}
                  />
                  <span>Color</span>
                </label>
                <label className={`${styles.radio} ${colorMode === "bw" ? styles.active : ""}`}>
                  <input 
                    type="radio" 
                    name="colorMode" 
                    value="bw"
                    checked={colorMode === "bw"}
                    onChange={() => setColorMode("bw")}
                  />
                  <span>B&W</span>
                </label>
              </div>
            </div>

            {/* Copies */}
            <div className={styles.control}>
              <h3 className={styles.sectionTitle}>Copies</h3>
              <div className={styles.copiesBox}>
                <button onClick={() => setCopies(Math.max(1, copies - 1))}>−</button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button onClick={() => setCopies(copies + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button 
            className={styles.addBtn}
            onClick={handleAddToQueue}
            disabled={selectedImages.length === 0 || generating || !jsPDFReady}
          >
            {!jsPDFReady ? 'Loading...' : generating ? 'Generating...' : 'Add to Queue'}
          </button>
        </div>
      </div>
    </div>
  )
}