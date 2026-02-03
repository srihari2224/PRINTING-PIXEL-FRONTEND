"use client"

import { useState, useEffect } from "react"
import { Dithering } from "@paper-design/shaders-react"
import { X, FileText, Image as ImageIcon, ArrowLeft } from "lucide-react"
import ImagePrintSettings from "./ImagePrintSettings"
import styles from "./UploadPage.module.css"

interface QueueItem {
  id: number
  file?: File
  fileName: string
  fileType: string
  totalPages?: number
  printSettings?: {
    copies: number
    pageRange: "all" | "custom"
    customPages: string
    doubleSided: "one-side" | "both-sides"
    colorMode: "color" | "bw"
  }
  type?: "pdf" | "image-layout"
  layout?: any
  images?: any[]
  pagesToPrint?: number
  cost: number
  timestamp: string
  copies?: number
}

interface UploadPageProps {
  slug: string
  onUploadComplete: (data: any) => void
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function UploadPage({ slug, onUploadComplete }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [printQueue, setPrintQueue] = useState<QueueItem[]>([])
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [showPdfSettings, setShowPdfSettings] = useState(false)
  const [showImageSettings, setShowImageSettings] = useState(false)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [allPdfPages, setAllPdfPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")

  const [settings, setSettings] = useState({
    copies: 1,
    pageRange: "all" as "all" | "custom",
    customPages: "",
    doubleSided: "one-side" as "one-side" | "both-sides",
    colorMode: "bw" as "color" | "bw",
  })

  /* ── load PDF.js once ── */
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.pdfjsLib) return
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }
    }
    document.head.appendChild(script)
  }, [])

  /* ── file input handler ── */
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || [])
    if (list.length === 0) return

    setVerifying(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const pdfs = list.filter((f) => f.type.includes("pdf"))
    const images = list.filter((f) => f.type.startsWith("image/"))

    if (pdfs.length === 0 && images.length === 0) {
      setError("Please upload PDF or image files only.")
      setVerifying(false)
      return
    }

    setFiles(pdfs)
    setImageFiles(images)
    setVerifying(false)
  }

  const handleBackToUpload = () => {
    setFiles([])
    setImageFiles([])
    setPrintQueue([])
    setError("")
  }

  /* ── PDF helpers ── */
  const getPDFPageCount = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      try {
        if (!window.pdfjsLib) return resolve(1)
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const typedArray = new Uint8Array(e.target?.result as ArrayBuffer)
            const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise
            resolve(pdf.numPages)
          } catch {
            resolve(1)
          }
        }
        reader.readAsArrayBuffer(file)
      } catch {
        resolve(1)
      }
    })
  }

  const loadPDFPreview = async (file: File) => {
    try {
      if (!window.pdfjsLib) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer)
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise
          const pages: any[] = []
          const maxPreviewPages = Math.min(pdf.numPages, 5)
          for (let i = 1; i <= maxPreviewPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 1.2 })
            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            canvas.height = viewport.height
            canvas.width = viewport.width
            await page.render({ canvasContext: context, viewport }).promise
            pages.push({ canvas, pageNumber: i })
          }
          setAllPdfPages(pages)
        } catch (err) {
          console.error("Error rendering PDF:", err)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      console.error("Error loading PDF preview:", err)
    }
  }

  const handlePdfClick = async (file: File) => {
    setSelectedPdf(file)
    const pageCount = await getPDFPageCount(file)
    setPdfPageCount(pageCount)
    setSettings({ copies: 1, pageRange: "all", customPages: "", doubleSided: "one-side", colorMode: "bw" })
    await loadPDFPreview(file)
    setShowPdfSettings(true)
  }

  /* ── cost helpers ── */
  const calculateCustomPages = () => {
    if (!settings.customPages.trim()) return 0
    try {
      let totalPages = 0
      settings.customPages.split(",").forEach((range) => {
        const trimmed = range.trim()
        if (trimmed.includes("-")) {
          const [start, end] = trimmed.split("-").map((n) => Number.parseInt(n.trim()))
          if (start && end && start <= end && start >= 1 && end <= pdfPageCount)
            totalPages += end - start + 1
        } else {
          const pageNum = Number.parseInt(trimmed)
          if (pageNum >= 1 && pageNum <= pdfPageCount) totalPages += 1
        }
      })
      return totalPages
    } catch {
      return 0
    }
  }

  const calculateCost = () => {
    if (!selectedPdf || pdfPageCount === 0) return 0
    let totalPages = settings.pageRange === "all" ? pdfPageCount : calculateCustomPages()
    totalPages *= settings.copies
    const costPerPage = settings.colorMode === "color" ? 10 : 2
    if (settings.doubleSided === "both-sides") {
      if (settings.colorMode === "color") return totalPages * 10
      const sheets = Math.ceil(totalPages / 2)
      return totalPages % 2 === 0 ? sheets * 3 : (sheets - 1) * 3 + 2
    }
    return totalPages * costPerPage
  }

  /* ── queue actions ── */
  const handleAddPdfToQueue = () => {
    if (!selectedPdf) return
    const pagesToPrint = settings.pageRange === "all" ? pdfPageCount : calculateCustomPages()
    const queueItem: QueueItem = {
      id: Date.now(),
      file: selectedPdf,
      fileName: selectedPdf.name,
      fileType: "pdf",
      type: "pdf",
      totalPages: pdfPageCount,
      printSettings: { ...settings },
      pagesToPrint,
      cost: calculateCost(),
      timestamp: new Date().toLocaleTimeString(),
    }
    setPrintQueue((prev) => [...prev, queueItem])
    setShowPdfSettings(false)
    setSelectedPdf(null)
  }

  const handleAddImageToQueue = (printJob: any) => {
    setPrintQueue((prev) => [...prev, printJob])
  }

  const removeFromQueue = (itemId: number) => {
    setPrintQueue((prev) => prev.filter((item) => item.id !== itemId))
  }

  /* ── upload ── */
  const handleUpload = async () => {
    if (printQueue.length === 0) return setError("Please add at least one item to the queue")
    setLoading(true)
    setError("")
    try {
      const formData = new FormData()
      const pdfQueue = printQueue.filter((item) => item.type === "pdf")
      pdfQueue.forEach((item) => item.file && formData.append("files", item.file))
      formData.append("kioskId", slug)
      formData.append(
        "printOptions",
        JSON.stringify(
          pdfQueue.map((item) => ({
            copies: item.printSettings?.copies || 1,
            colorMode: item.printSettings?.colorMode || "bw",
            duplex: item.printSettings?.doubleSided === "both-sides" ? "double" : "single",
            pageRange: item.printSettings?.pageRange === "all" ? "all" : item.printSettings?.customPages || "all",
            name: item.fileName,
          }))
        )
      )
      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const data = await uploadRes.json()
      onUploadComplete({ ...data, kioskId: slug })
    } catch (err: any) {
      setError(err?.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalCost = () => printQueue.reduce((total, item) => total + item.cost, 0)

  /* ── derived ── */
  const imageUrls = imageFiles.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
    file,
  }))

  const showEmptyState = files.length === 0 && imageFiles.length === 0 && printQueue.length === 0

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className={`${styles.container} ${showEmptyState ? styles.emptyState : ""}`}>
      {/* dithering bg — only after upload */}
      {!showEmptyState && <Dithering className={styles.backgroundPattern} speed={0.0003} />}

      <div className={styles.content}>
        {/* ─── EMPTY / LANDING STATE ─── */}
        {showEmptyState ? (
          <div className={styles.emptyStateWrapper}>
            {/* header row: logo + hamburger */}
            <div className={styles.emptyHeader}>
              <div className={styles.emptyLogo}>
                <span className={styles.logoText}>ezio</span>
              </div>
              <button className={styles.emptyMenuBtn} aria-label="menu">
                <div className={styles.menuIcon}>
                  <span />
                  <span />
                  <span />
                </div>
              </button>
            </div>

            {/* middle hero — full-width #333 block with poster image */}
            <div className={styles.emptyMiddle}>
              <div className={styles.heroImageContainer}>
                <img
                  src="/images/upload-bg-poster.png"
                  alt="Print My Images PDF"
                  className={styles.heroImage}
                />
              </div>
            </div>

            {/* bottom white section — "Services"-style title */}
            <div className={styles.emptyServices}>
              {/* large ghost outline text behind */}
              <div className={styles.servicesOutlineText} aria-hidden="true">
                UPLOAD
              </div>
              {/* solid heading on top */}
              <div className={styles.servicesTitleWrapper}>
                <h1 className={styles.servicesTitle}>UPLOAD</h1>
              </div>
            </div>

            {/* description + pill button */}
            <div className={styles.emptyBottom}>
              <p className={styles.servicesDesc}>
                We love crafting beautiful, smart and inspired work that is
                focused on your business&apos; goals and customers. We do this
                across multiple touch points to help you achieve your vision.
              </p>
              <label className={styles.discoverButton}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFilesChange}
                  className={styles.fileInput}
                />
                <span className={styles.uploadPlusIcon}>+</span>
                <span>UPLOAD</span>
              </label>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE STATE header with FILES design + Back button ─── */
          <>
            <div className={styles.filesHeader}>
              <div className={styles.filesServicesOutlineText} aria-hidden="true">
                FILES
              </div>
              <div className={styles.filesServicesTitleWrapper}>
                <h1 className={styles.filesServicesTitle}>FILES</h1>
              </div>
              <button className={styles.backButton} onClick={handleBackToUpload}>
                <ArrowLeft size={20} />
              </button>
            </div>
          </>
        )}

        {/* ─── PDF list ─── */}
        {!showEmptyState && files.length > 0 && (
          <div className={styles.pdfSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <FileText size={20} />
                <h3>PDF DOCUMENTS</h3>
              </div>
              <div className={styles.sectionCount}>{files.length}</div>
            </div>
            <div className={styles.pdfList}>
              {files.map((file, index) => (
                <div key={index} className={styles.pdfCard} onClick={() => handlePdfClick(file)}>
                  <div className={styles.pdfIcon}>
                    <FileText size={24} />
                  </div>
                  <div className={styles.pdfInfo}>
                    <div className={styles.pdfName}>
                      {file.name.length > 25 ? `${file.name.substring(0, 25)}…` : file.name}
                    </div>
                    <div className={styles.pdfSize}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button className={styles.configureBtn}>CONFIGURE</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Image list ─── */}
        {!showEmptyState && imageFiles.length > 0 && (
          <div className={styles.pdfSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <ImageIcon size={20} />
                <h3>IMAGES</h3>
              </div>
              <div className={styles.sectionCount}>{imageFiles.length}</div>
            </div>
            <div className={styles.imageGrid}>
              {imageFiles.map((file, index) => (
                <div key={index} className={styles.imageCard}>
                  <img src={URL.createObjectURL(file)} alt={file.name} className={styles.imagePreview} />
                  <div className={styles.imageName}>
                    {file.name.length > 15 ? `${file.name.substring(0, 15)}…` : file.name}
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.arrangeImagesBtn} onClick={() => setShowImageSettings(true)}>
              <span className={styles.uploadPlusIcon}>+</span>
              <span>ARRANGE IMAGES</span>
            </button>
          </div>
        )}

        {/* ─── Print Queue ─── */}
        {!showEmptyState && printQueue.length > 0 && (
          <div className={styles.queueSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <h3>PRINT QUEUE</h3>
              </div>
              <div className={styles.sectionCount}>{printQueue.length}</div>
            </div>
            <div className={styles.queueList}>
              {printQueue.map((item) => (
                <div key={item.id} className={styles.queueItem}>
                  <div className={styles.queueIcon}>
                    {item.type === "image-layout" ? <ImageIcon size={20} /> : <FileText size={20} />}
                  </div>
                  <div className={styles.queueInfo}>
                    <div className={styles.queueName}>
                      {item.type === "image-layout"
                        ? `${item.layout?.name} – ${item.images?.length} images`
                        : item.fileName.length > 22 ? `${item.fileName.substring(0, 22)}…` : item.fileName}
                    </div>
                    <div className={styles.queueDetails}>
                      {item.type === "image-layout"
                        ? `${item.copies} ${item.copies && item.copies > 1 ? "copies" : "copy"}`
                        : `${item.printSettings?.copies} ${item.printSettings?.copies && item.printSettings.copies > 1 ? "copies" : "copy"} • ${item.printSettings?.pageRange} • ${item.printSettings?.colorMode === "color" ? "Color" : "B&W"} • ${item.printSettings?.doubleSided === "both-sides" ? "Duplex" : "Single"}`}
                    </div>
                    <div className={styles.queueCost}>₹{item.cost}</div>
                  </div>
                  <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id) }}>
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── error ─── */}
        {!showEmptyState && error && <div className={styles.errorMessage}>{error}</div>}

        {/* ─── sticky footer ─── */}
        {!showEmptyState && printQueue.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.footerContent}>
              <div className={styles.totalInfo}>
                <p>Total Cost</p>
                <h2>₹{calculateTotalCost()}</h2>
              </div>
              <button 
                onClick={handleUpload} 
                disabled={loading || printQueue.length === 0} 
                className={styles.proceedButton}
              >
                {loading ? "UPLOADING..." : "PROCEED TO PAYMENT"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ PDF Settings Modal - FULLSCREEN ═══ */}
      {showPdfSettings && selectedPdf && (
        <div className={styles.fullscreenModal}>
          <div className={styles.fullscreenContent}>
            {/* Header */}
            <div className={styles.fullscreenHeader}>
              <button className={styles.backBtn} onClick={() => setShowPdfSettings(false)}>
                <X size={24} />
              </button>
              <h2>PDF SETTINGS</h2>
              <div className={styles.headerSpacer} />
            </div>

            {/* Scrollable Content */}
            <div className={styles.fullscreenBody}>
              {/* File Info */}
              <div className={styles.fileInfoCard}>
                <div className={styles.fileInfoIcon}>
                  <FileText size={28} />
                </div>
                <div className={styles.fileInfoText}>
                  <h3>{selectedPdf.name.length > 30 ? `${selectedPdf.name.substring(0, 30)}...` : selectedPdf.name}</h3>
                  <p>{pdfPageCount} pages • {(selectedPdf.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              {/* Settings */}
              <div className={styles.settingsContainer}>
                <div className={styles.settingGroup}>
                  <label>COPIES</label>
                  <input
                    type="number" 
                    min="1" 
                    max="99" 
                    value={settings.copies}
                    onChange={(e) => setSettings({ ...settings, copies: Number.parseInt(e.target.value) || 1 })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.settingGroup}>
                  <label>PAGES</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input 
                        type="radio" 
                        name="pageRange" 
                        value="all" 
                        checked={settings.pageRange === "all"} 
                        onChange={() => setSettings({ ...settings, pageRange: "all" })} 
                      />
                      <span>All Pages</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input 
                        type="radio" 
                        name="pageRange" 
                        value="custom" 
                        checked={settings.pageRange === "custom"} 
                        onChange={() => setSettings({ ...settings, pageRange: "custom" })} 
                      />
                      <span>Custom Range</span>
                    </label>
                  </div>
                  {settings.pageRange === "custom" && (
                    <input 
                      type="text" 
                      placeholder="e.g. 1-5, 8, 11-13" 
                      value={settings.customPages} 
                      onChange={(e) => setSettings({ ...settings, customPages: e.target.value })} 
                      className={styles.input} 
                    />
                  )}
                </div>

                <div className={styles.settingGroup}>
                  <label>COLOR MODE</label>
                  <div className={styles.buttonGroup}>
                    <button 
                      className={`${styles.optionBtn} ${settings.colorMode === "color" ? styles.active : ""}`} 
                      onClick={() => setSettings({ ...settings, colorMode: "color" })}
                    >
                      🎨 Color
                    </button>
                    <button 
                      className={`${styles.optionBtn} ${settings.colorMode === "bw" ? styles.active : ""}`} 
                      onClick={() => setSettings({ ...settings, colorMode: "bw" })}
                    >
                      ⚫ Black & White
                    </button>
                  </div>
                </div>

                <div className={styles.settingGroup}>
                  <label>DUPLEX</label>
                  <div className={styles.buttonGroup}>
                    <button 
                      className={`${styles.optionBtn} ${settings.doubleSided === "one-side" ? styles.active : ""}`} 
                      onClick={() => setSettings({ ...settings, doubleSided: "one-side" })}
                    >
                      📄 One-Sided
                    </button>
                    <button 
                      className={`${styles.optionBtn} ${settings.doubleSided === "both-sides" ? styles.active : ""}`} 
                      onClick={() => setSettings({ ...settings, doubleSided: "both-sides" })}
                    >
                      📑 Double-Sided
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className={styles.previewSection}>
                <h3>PREVIEW</h3>
                <div className={styles.previewGrid}>
                  {allPdfPages.map((page, index) => (
                    <div key={index} className={styles.previewPage}>
                      <div className={styles.pageNumber}>Page {page.pageNumber}</div>
                      <canvas
                        ref={(canvas) => {
                          if (canvas && page.canvas) {
                            const ctx = canvas.getContext("2d")
                            if (!ctx) return
                            const scale = 0.3
                            canvas.width = page.canvas.width * scale
                            canvas.height = page.canvas.height * scale
                            ctx.drawImage(page.canvas, 0, 0, canvas.width, canvas.height)
                            canvas.style.filter = settings.colorMode === "bw" ? "grayscale(100%)" : "none"
                          }
                        }}
                        className={styles.previewCanvas}
                      />
                    </div>
                  ))}
                  {allPdfPages.length === 0 && <div className={styles.loadingPreview}>Loading preview…</div>}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.fullscreenFooter}>
              <div className={styles.costDisplay}>
                <span>TOTAL COST</span>
                <span className={styles.cost}>₹{calculateCost()}</span>
              </div>
              <button 
                className={styles.addToQueueBtn} 
                onClick={handleAddPdfToQueue} 
                disabled={calculateCost() === 0}
              >
                <span className={styles.uploadPlusIcon}>+</span>
                <span>ADD TO QUEUE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Image Print Settings Modal ═══ */}
      {showImageSettings && imageFiles.length > 0 && (
        <ImagePrintSettings
          images={imageUrls}
          onClose={() => setShowImageSettings(false)}
          onAddToQueue={handleAddImageToQueue}
        />
      )}

      {/* ═══ Verification Loader ═══ */}
      {verifying && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loaderContent}>
            <div className={styles.loaderSpinner}>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
            </div>
            <p className={styles.loaderText}>VERIFYING FILES</p>
            <p className={styles.loaderSubtext}>Please wait...</p>
          </div>
        </div>
      )}
    </div>
  )
}