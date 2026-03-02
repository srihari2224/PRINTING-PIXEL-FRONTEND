"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  FileText,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Plus,
  Printer,
  Upload,
  ChevronRight,
  Layers,
} from "lucide-react"
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
  thumbnailUrl?: string
}

interface UploadPageProps {
  slug: string
  onUploadComplete: (data: any) => void
  initialQueue?: QueueItem[]
  initialFiles?: File[]
  initialImageFiles?: File[]
  isDark?: boolean
  onThemeToggle?: () => void
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function UploadPage({ slug, onUploadComplete, initialQueue, initialFiles, initialImageFiles, isDark = true, onThemeToggle }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>(initialFiles || [])
  const [imageFiles, setImageFiles] = useState<File[]>(initialImageFiles || [])
  const [printQueue, setPrintQueue] = useState<QueueItem[]>(initialQueue || [])
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [showPdfSettings, setShowPdfSettings] = useState(false)
  const [showImageSettings, setShowImageSettings] = useState(false)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [allPdfPages, setAllPdfPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [pdfThumbnails, setPdfThumbnails] = useState<{ [key: string]: string }>({})

  const [settings, setSettings] = useState({
    copies: 1,
    pageRange: "all" as "all" | "custom",
    customPages: "",
    doubleSided: "one-side" as "one-side" | "both-sides",
    colorMode: "bw" as "color" | "bw",
  })

  const [pageCounts, setPageCounts] = useState<{ [key: string]: number }>({})

  const addMoreRef = useRef<HTMLInputElement>(null)

  /* ── load PDF.js once ── */
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.pdfjsLib) {
      // Already loaded — still regenerate thumbnails for restored files
      restoreInitialFileThumbnails()
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }
      restoreInitialFileThumbnails()
    }
    document.head.appendChild(script)
  }, [])

  /* ── regenerate thumbnails/page-counts for files restored from back-nav ── */
  const restoreInitialFileThumbnails = () => {
    if (!initialFiles || initialFiles.length === 0) return
    initialFiles.forEach(async (file) => {
      const count = await getPDFPageCount(file)
      setPageCounts((prev) => ({ ...prev, [file.name]: count }))
      generatePdfThumbnail(file)
    })
  }


  /* ── file input handler ── */
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || [])
    if (list.length === 0) return

    setVerifying(true)
    setError("")

    const pdfs = list.filter((f) => f.type.includes("pdf"))
    const images = list.filter((f) => f.type.startsWith("image/"))

    if (pdfs.length === 0 && images.length === 0) {
      setError("Please upload PDF or image files only.")
      setVerifying(false)
      return
    }

    const newCounts: { [key: string]: number } = {}
    await Promise.all(
      pdfs.map(async (file) => {
        const count = await getPDFPageCount(file)
        newCounts[file.name] = count
      })
    )

    setPageCounts((prev) => ({ ...prev, ...newCounts }))

    // Merge with existing files
    setFiles((prev) => {
      const existing = prev.map((f) => f.name)
      const newPdfs = pdfs.filter((f) => !existing.includes(f.name))
      return [...prev, ...newPdfs]
    })
    setImageFiles((prev) => {
      const existing = prev.map((f) => f.name)
      const newImgs = images.filter((f) => !existing.includes(f.name))
      return [...prev, ...newImgs]
    })

    // Generate thumbnails for new PDFs
    for (const file of pdfs) {
      generatePdfThumbnail(file)
    }

    setVerifying(false)

    // Reset input so same file can be re-added if needed
    e.target.value = ""
  }

  /* ── generate first-page thumbnail ── */
  const generatePdfThumbnail = async (file: File) => {
    try {
      if (!window.pdfjsLib) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer)
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
          setPdfThumbnails((prev) => ({ ...prev, [file.name]: dataUrl }))
        } catch (err) {
          console.error("Thumbnail generation error:", err)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      console.error("Thumbnail error:", err)
    }
  }

  const handleBackToUpload = () => {
    setFiles([])
    setImageFiles([])
    setPrintQueue([])
    setError("")
    setPageCounts({})
    setPdfThumbnails({})
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
    const pageCount = pageCounts[file.name] || (await getPDFPageCount(file))
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

    let thumbnailUrl = pdfThumbnails[selectedPdf.name] || ""
    if (!thumbnailUrl && allPdfPages.length > 0) {
      const firstPage = allPdfPages.find((p) => p.pageNumber === 1)
      if (firstPage?.canvas) thumbnailUrl = firstPage.canvas.toDataURL()
    }

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
      thumbnailUrl,
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
      const pdfQueue = printQueue.filter((item) => item.type === "pdf" || item.type === "image-layout")
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
      onUploadComplete({ ...data, kioskId: slug, _queue: printQueue, _files: files, _imageFiles: imageFiles })
    } catch (err: any) {
      setError(err?.message || "Upload failed")
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

      {/* ─── UPLOAD LOADER OVERLAY ─── */}
      {loading && (
        <div className={styles.uploadOverlay}>
          <div className={styles.uploadLoaderBox}>
            <div className={styles.uploadSpinner}>
              <div className={styles.spinnerRing} />
              <div className={styles.spinnerRing} />
              <div className={styles.spinnerRing} />
            </div>
            <p className={styles.uploadLoaderTitle}>UPLOADING</p>
            <p className={styles.uploadLoaderSub}>Please wait...</p>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {/* ─── EMPTY / LANDING STATE ─── */}
        {showEmptyState ? (
          <div className={`${styles.emptyStateWrapper} ${isDark ? styles.dark : styles.light}`}>

            {/* ── Top bar ── */}
            <div className={styles.emptyHeader}>
              <div className={styles.emptyLogo}>
                <span className={styles.logoMark}>PRINTIT</span>
              </div>
              {onThemeToggle && (
                <button className={styles.themeToggleBtn} onClick={onThemeToggle} aria-label="Toggle theme">
                  {isDark
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  }
                </button>
              )}
            </div>

            {/* ── Hero ── */}
            <div className={styles.heroSection}>
              <div className={styles.heroLabel}>SELF-SERVICE PRINTING KIOSK</div>
              <h1 className={styles.heroTitle}>
                Print anything,<br />
                <span className={styles.heroAccent}>instantly.</span>
              </h1>
              <p className={styles.heroDesc}>
                Upload your PDFs &amp; images. Configure print settings. Pay &amp; collect — all in under 2 minutes.
              </p>

              {/* Feature pills */}
              <div className={styles.featurePills}>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>Fast</span>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="1" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Secure</span>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>Kiosk-Ready</span>
              </div>

              {/* CTA */}
              <label className={styles.discoverButton}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFilesChange}
                  className={styles.fileInput}
                />
                <Plus size={20} strokeWidth={2.5} />
                <span>SELECT FILES</span>
              </label>

              <p className={styles.ctaHint}>PDF and image files supported · Max 50 MB</p>
            </div>

            {/* ── Footer ── */}
            <div className={styles.emptyFooter}>
              <span>Powered by</span>
              <span className={styles.footerBrand}>INNVERA</span>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE STATE ─── */
          <div className={styles.activeState}>

            {/* ── Top bar: back + add more files ── */}
            <div className={styles.topBar}>
              <button className={styles.topBackBtn} onClick={handleBackToUpload} aria-label="Back">
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <span className={styles.topBarTitle}>FILES</span>
              <label className={styles.addMoreBtn}>
                <input
                  ref={addMoreRef}
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFilesChange}
                  className={styles.fileInput}
                />
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Files</span>
              </label>
            </div>

            {/* ── PDF LIST ── */}
            {files.length > 0 && (
              <div className={styles.pdfSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionHeaderLeft}>
                    <FileText size={16} strokeWidth={2} />
                    <h3>PDF DOCUMENTS</h3>
                  </div>
                  <div className={styles.sectionCount}>{files.length}</div>
                </div>

                <div className={styles.pdfList}>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={styles.pdfCard}
                      onClick={() => handlePdfClick(file)}
                    >
                      {/* Card header — PDF first page thumbnail */}
                      <div
                        className={styles.cardHeader}
                        style={
                          pdfThumbnails[file.name]
                            ? {
                              backgroundImage: `url(${pdfThumbnails[file.name]})`,
                              backgroundSize: "cover",
                              backgroundPosition: "top center",
                            }
                            : undefined
                        }
                      >
                        {!pdfThumbnails[file.name] && (
                          <div className={styles.cardHeaderPlaceholder}>
                            <FileText size={32} strokeWidth={1.5} />
                          </div>
                        )}
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handlePdfClick(file) }}>
                          Edit
                        </button>
                      </div>

                      {/* Overlapping icon */}
                      <div className={styles.cardIconWrapper}>
                        <FileText size={22} className={styles.pdfIconImg} strokeWidth={1.5} />
                      </div>

                      {/* Footer */}
                      <div className={styles.cardFooter}>
                        <div>
                          <div className={styles.pdfName}>{file.name}</div>
                          <div className={styles.pdfAuthor}>@user · Uploaded</div>
                        </div>
                        <div className={styles.pdfMeta}>
                          <span>{(file.size / 1024).toFixed(0)} KB</span>
                          {pageCounts[file.name] !== undefined && (
                            <span>{pageCounts[file.name]} Pages</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── IMAGE LIST ── */}
            {imageFiles.length > 0 && (
              <div className={styles.pdfSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionHeaderLeft}>
                    <ImageIcon size={16} strokeWidth={2} />
                    <h3>IMAGES</h3>
                  </div>
                  <div className={styles.sectionCount}>{imageFiles.length}</div>
                </div>
                <div className={styles.imageList}>
                  {imageFiles.map((file, index) => (
                    <div key={index} className={styles.imageCard}>
                      <img src={URL.createObjectURL(file)} alt={file.name} className={styles.imagePreview} />
                    </div>
                  ))}
                </div>
                <button className={styles.arrangeImagesBtn} onClick={() => setShowImageSettings(true)}>
                  <Layers size={16} strokeWidth={2} />
                  <span>Arrange &amp; Print Images</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* ── QUEUE ── */}
            {printQueue.length > 0 && (
              <div className={styles.queueSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionHeaderLeft}>
                    <Printer size={16} strokeWidth={2} />
                    <h3>PRINT QUEUE</h3>
                  </div>
                  <div className={styles.sectionCount}>{printQueue.length}</div>
                </div>

                <div className={styles.queueList}>
                  {printQueue.map((item, index) => {
                    const isPdf = item.type === "pdf"
                    const displayImages = imageFiles.slice(0, 3)
                    while (displayImages.length > 0 && displayImages.length < 3) {
                      displayImages.push(displayImages[0])
                    }

                    return (
                      <div
                        key={index}
                        className={`${styles.queueCard} ${isPdf ? styles.pdfQueueCard : styles.imageQueueCard}`}
                      >
                        {/* Delete */}
                        <button
                          className={styles.queueDeleteBtn}
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id) }}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>

                        {/* Header */}
                        <div
                          className={styles.queueCardHeader}
                          style={
                            isPdf && item.thumbnailUrl
                              ? { backgroundImage: `url(${item.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "top center" }
                              : undefined
                          }
                        >
                          {isPdf ? (
                            <div className={styles.pdfBadge} style={item.thumbnailUrl ? { display: "none" } : undefined}>
                              PDF
                            </div>
                          ) : (
                            <>
                              <div className={styles.memoriesLabel}>PHOTOS</div>
                              <div className={styles.memoriesTitle}>{item.fileName || "Collection"}</div>
                            </>
                          )}
                        </div>

                        {/* Image Collage */}
                        {!isPdf && (
                          <div className={styles.memoriesCollage}>
                            {displayImages.slice(0, 3).map((img, i) => (
                              <img key={i} src={URL.createObjectURL(img)} className={styles.collageImg} alt="" />
                            ))}
                          </div>
                        )}

                        {/* PDF footer info */}
                        {isPdf && item.printSettings && (
                          <div className={styles.queueCardFooter}>
                            <div className={styles.queueTitle}>{item.fileName}</div>
                            <div className={styles.queueSubtitle}>
                              {item.printSettings.copies} {item.printSettings.copies === 1 ? "Copy" : "Copies"} ·{" "}
                              {item.printSettings.colorMode === "color" ? "Color" : "B&W"}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* error */}
            {error && <div className={styles.errorMessage}>{error}</div>}

          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM BAR (only when queue has items) ─── */}
      {!showEmptyState && printQueue.length > 0 && (
        <div className={styles.stickyBottom}>
          <div className={styles.stickyLeft}>
            <span className={styles.stickyLabel}>TOTAL</span>
            <span className={styles.stickyAmount}>₹{calculateTotalCost()}</span>
          </div>
          <button
            className={styles.stickyProceedBtn}
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? "Uploading..." : (
              <>
                <span>PROCEED</span>
                <ChevronRight size={18} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── PDF Settings Modal ─── */}
      {showPdfSettings && selectedPdf && (
        <div className={styles.fullscreenModal}>
          <div className={styles.fullscreenContent}>
            {/* Header */}
            <div className={styles.fullscreenHeader}>
              <button className={styles.backBtn} onClick={() => setShowPdfSettings(false)}>
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <h2>PDF SETTINGS</h2>
              <div className={styles.headerSpacer} />
            </div>

            {/* Body */}
            <div className={styles.fullscreenBody}>
              {/* File Info */}
              <div className={styles.fileInfoCard}>
                <div className={styles.fileInfoIcon}>
                  <FileText size={28} strokeWidth={1.5} />
                </div>
                <div className={styles.fileInfoText}>
                  <h3>{selectedPdf.name.length > 30 ? `${selectedPdf.name.substring(0, 30)}...` : selectedPdf.name}</h3>
                  <p>{pdfPageCount} pages · {(selectedPdf.size / 1024).toFixed(1)} KB</p>
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
                      Color
                    </button>
                    <button
                      className={`${styles.optionBtn} ${settings.colorMode === "bw" ? styles.active : ""}`}
                      onClick={() => setSettings({ ...settings, colorMode: "bw" })}
                    >
                      Black &amp; White
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
                      One-Sided
                    </button>
                    <button
                      className={`${styles.optionBtn} ${settings.doubleSided === "both-sides" ? styles.active : ""}`}
                      onClick={() => setSettings({ ...settings, doubleSided: "both-sides" })}
                    >
                      Double-Sided
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
                <Plus size={18} strokeWidth={2.5} />
                <span>ADD TO QUEUE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Print Settings Modal ─── */}
      {showImageSettings && imageFiles.length > 0 && (
        <ImagePrintSettings
          images={imageUrls}
          onClose={() => setShowImageSettings(false)}
          onAddToQueue={handleAddImageToQueue}
        />
      )}

      {/* ─── Verification Loader ─── */}
      {verifying && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loaderContent}>
            <div className={styles.loaderSpinner}>
              <div className={styles.spinnerRing} />
              <div className={styles.spinnerRing} />
              <div className={styles.spinnerRing} />
            </div>
            <p className={styles.loaderText}>VERIFYING FILES</p>
            <p className={styles.loaderSubtext}>Please wait...</p>
          </div>
        </div>
      )}
    </div>
  )
}