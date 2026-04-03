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
  HelpCircle,
} from "lucide-react"
import ImagePrintSettings from "./ImagePrintSettings"
import PaperShop from "./PaperShop"
import HelpPage from "./HelpPage"
import PolicyPage from "./PolicyPage"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import styles from "./UploadPage.module.css"

const GOOGLE_CLIENT_ID = "71594743056-rd5v1od8fej9run4rnmn4r5gdq62sqgt.apps.googleusercontent.com"

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
  onShopPaymentSuccess?: (otp: string, queue: any[]) => void
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function UploadPage({ slug, onUploadComplete, initialQueue, initialFiles, initialImageFiles, isDark = true, onThemeToggle, onShopPaymentSuccess }: UploadPageProps) {
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
  const [authError, setAuthError] = useState("")
  const [pdfThumbnails, setPdfThumbnails] = useState<{ [key: string]: string }>({})
  const [showShop, setShowShop] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showPolicy, setShowPolicy] = useState<"terms" | "privacy" | "refund" | null>(null)
  const [adminUser, setAdminUser] = useState<{ name: string; picture: string; email: string } | null>(null)
  const [paperLevel, setPaperLevel] = useState(145)
  const paperMax = 250

  // Filtered pages for preview (based on custom page range)
  const [filteredPageIndices, setFilteredPageIndices] = useState<number[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`admin-user-${slug}`)
      if (saved) setAdminUser(JSON.parse(saved))
    } catch { }
  }, [slug])

  const handleAdminSignIn = (payload: { name: string; picture: string; email: string }) => {
    setAdminUser(payload)
    try { localStorage.setItem(`admin-user-${slug}`, JSON.stringify(payload)) } catch { }
  }

  const handleAdminSignOut = () => {
    setAdminUser(null)
    try { localStorage.removeItem(`admin-user-${slug}`) } catch { }
  }

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

  /* Recompute which pages to show in preview based on settings */
  useEffect(() => {
    if (settings.pageRange === "all") {
      setFilteredPageIndices(allPdfPages.map((_, i) => i))
    } else {
      const indices = parseCustomPageIndices(settings.customPages, pdfPageCount, allPdfPages)
      setFilteredPageIndices(indices)
    }
  }, [settings.pageRange, settings.customPages, allPdfPages, pdfPageCount])

  const parseCustomPageIndices = (customPages: string, totalPages: number, pages: any[]): number[] => {
    if (!customPages.trim()) return []
    const pageNums = new Set<number>()
    customPages.split(",").forEach((range) => {
      const trimmed = range.trim()
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim()))
        if (start && end && start <= end) {
          for (let p = start; p <= Math.min(end, totalPages); p++) pageNums.add(p)
        }
      } else {
        const pageNum = parseInt(trimmed)
        if (pageNum >= 1 && pageNum <= totalPages) pageNums.add(pageNum)
      }
    })
    // Map page numbers to indices in allPdfPages (which only has first 5 pages rendered)
    return pages
      .map((page, i) => ({ page, i }))
      .filter(({ page }) => pageNums.has(page.pageNumber))
      .map(({ i }) => i)
  }

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

    for (const file of pdfs) {
      generatePdfThumbnail(file)
    }

    setVerifying(false)
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
          const maxPreviewPages = Math.min(pdf.numPages, 10)
          for (let i = 1; i <= maxPreviewPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 1.5 })
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
    setAllPdfPages([])
    setFilteredPageIndices([])
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

  // Pages to show in preview
  const pagesToDisplay = settings.pageRange === "all"
    ? allPdfPages
    : allPdfPages.filter((_, i) => filteredPageIndices.includes(i))

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
              <div className={styles.headerRight}>
                {onThemeToggle && (
                  <button className={styles.themeToggleBtn} onClick={onThemeToggle} aria-label="Toggle theme">
                    {isDark
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    }
                  </button>
                )}
                <button className={styles.helpBtn} onClick={() => setShowHelp(true)} aria-label="Help & Support">
                  <HelpCircle size={18} strokeWidth={2} />
                </button>
              </div>
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
              <div className={styles.featurePills}>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>Fast</span>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="1" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Secure</span>
                <span className={styles.pill}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>Kiosk-Ready</span>
              </div>
              <label className={styles.discoverButton}>
                <input type="file" multiple accept=".pdf,image/*" onChange={handleFilesChange} className={styles.fileInput} />
                <Plus size={20} strokeWidth={2.5} />
                <span>SELECT FILES</span>
              </label>
              <button className={styles.shopButton} onClick={() => setShowShop(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                <span>PAPER SHOP</span>
              </button>
              <p className={styles.ctaHint}>PDF and image files supported · Max 50 MB</p>
            </div>

            {/* ── Footer ── */}
            <div className={styles.emptyFooter}>
              <div className={styles.footerTop}>
                <span>Powered by</span>
                <span className={styles.footerBrand}>INNVERA</span>
              </div>
            </div>

            {/* ── Admin Card ── */}
            <div className={styles.adminCardOuter}>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                {adminUser ? (
                  <div className={styles.adminCardFull}>
                    <div className={styles.adminCardTopRow}>
                      <img src={adminUser.picture} alt={adminUser.name} className={styles.adminAvatarLg} />
                      <div className={styles.adminUserMeta}>
                        <div className={styles.adminUserName}>{adminUser.name}</div>
                        <div className={styles.adminUserTag}>Admin · {slug}</div>
                      </div>
                      <button className={styles.adminSignOutBtn} onClick={handleAdminSignOut}>Sign out</button>
                    </div>
                    <div className={styles.paperWidget}>
                      <div className={styles.paperWidgetHeader}>
                        <span className={styles.paperWidgetLabel}>Paper Level</span>
                        <span className={styles.paperWidgetValue}>{paperLevel} / {paperMax} sheets</span>
                      </div>
                      <div className={styles.paperTrack}>
                        <div className={styles.paperFill} style={{ width: `${(paperLevel / paperMax) * 100}%`, background: paperLevel < 50 ? '#ef4444' : paperLevel < 100 ? '#f59e0b' : '#22c55e' }} />
                      </div>
                      <div className={styles.paperSubtext}>{paperLevel < 50 ? 'Low — refill soon' : paperLevel < 100 ? 'Moderate' : 'Good'}</div>
                    </div>
                    <div className={styles.adminActions}>
                      <button className={styles.adminResetBtn} onClick={() => setPaperLevel(paperMax)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.44-4.04" /></svg>
                        Reset Paper
                      </button>
                      <a href="https://innveraui.vercel.app/sign-in" target="_blank" rel="noopener noreferrer" className={styles.adminDashBtn}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        Revenue Dashboard
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className={styles.adminCardFull}>
                    <div className={styles.adminCardLabel}>ADMIN ACCESS</div>
                    <h2 className={styles.adminCardTitle}>Kiosk Owner<br />or Servicer?</h2>
                    <p className={styles.adminCardDesc}>Sign in with your Google account to access the kiosk admin panel, monitor print jobs, and manage your fleet.</p>
                    <div className={styles.adminCardRow}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"><rect x="3" y="11" width="18" height="11" rx="1" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span className={styles.adminCardRowText}>SIGN IN FOR ADMIN ACCESS</span>
                    </div>
                    {authError && (
                      <div style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, marginBottom: "1rem", textAlign: "center", background: "rgba(239,68,68,0.1)", padding: "8px", borderRadius: "6px" }}>{authError}</div>
                    )}
                    <div className={styles.adminGoogleBtnWrap}>
                      <GoogleLogin
                        onSuccess={async (credentialResponse: any) => {
                          try {
                            setAuthError("")
                            const base64Url = credentialResponse.credential?.split('.')[1] || ''
                            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
                            const payload = JSON.parse(jsonPayload)
                            const userEmail = payload.email
                            if (userEmail === "msrihari2224@gmail.com") {
                              handleAdminSignIn({ name: payload.name, picture: payload.picture, email: userEmail })
                              return
                            }
                            const kioskRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kiosks/${slug}`)
                            if (!kioskRes.ok) { setAuthError("Failed to verify kiosk owner."); return }
                            const kioskData = await kioskRes.json()
                            if (kioskData?.kiosk?.ownerEmail && kioskData.kiosk.ownerEmail.toLowerCase() === userEmail.toLowerCase()) {
                              handleAdminSignIn({ name: payload.name, picture: payload.picture, email: userEmail })
                            } else {
                              setAuthError("Access Denied: You are not the registered owner of this kiosk.")
                            }
                          } catch (e) {
                            setAuthError("Authentication error occurred.")
                          }
                        }}
                        onError={() => setAuthError('Google Sign-In failed')}
                        size="large" shape="rectangular" theme={isDark ? 'filled_black' : 'outline'} text="signin_with" logo_alignment="left" width={300}
                      />
                    </div>
                    <p className={styles.adminCardNote}>For kiosk owners &amp; service technicians only</p>
                  </div>
                )}
              </GoogleOAuthProvider>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE STATE ─── */
          <div className={styles.activeState}>
            <div className={styles.topBar}>
              <button className={styles.topBackBtn} onClick={handleBackToUpload} aria-label="Back">
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <span className={styles.topBarTitle}>FILES</span>
              <label className={styles.addMoreBtn}>
                <input ref={addMoreRef} type="file" multiple accept=".pdf,image/*" onChange={handleFilesChange} className={styles.fileInput} />
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Files</span>
              </label>
            </div>

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
                    <div key={index} className={styles.pdfCard} onClick={() => handlePdfClick(file)}>
                      <div className={styles.cardHeader} style={pdfThumbnails[file.name] ? { backgroundImage: `url(${pdfThumbnails[file.name]})`, backgroundSize: "cover", backgroundPosition: "top center" } : undefined}>
                        {!pdfThumbnails[file.name] && <div className={styles.cardHeaderPlaceholder}><FileText size={32} strokeWidth={1.5} /></div>}
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handlePdfClick(file) }}>Edit</button>
                      </div>
                      <div className={styles.cardIconWrapper}>
                        <FileText size={22} className={styles.pdfIconImg} strokeWidth={1.5} />
                      </div>
                      <div className={styles.cardFooter}>
                        <div>
                          <div className={styles.pdfName}>{file.name}</div>
                          <div className={styles.pdfAuthor}>@user · Uploaded</div>
                        </div>
                        <div className={styles.pdfMeta}>
                          <span>{(file.size / 1024).toFixed(0)} KB</span>
                          {pageCounts[file.name] !== undefined && <span>{pageCounts[file.name]} Pages</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    while (displayImages.length > 0 && displayImages.length < 3) displayImages.push(displayImages[0])
                    return (
                      <div key={index} className={`${styles.queueCard} ${isPdf ? styles.pdfQueueCard : styles.imageQueueCard}`}>
                        <button className={styles.queueDeleteBtn} onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id) }}>
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <div className={styles.queueCardHeader} style={isPdf && item.thumbnailUrl ? { backgroundImage: `url(${item.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "top center" } : undefined}>
                          {isPdf ? (
                            <div className={styles.pdfBadge} style={item.thumbnailUrl ? { display: "none" } : undefined}>PDF</div>
                          ) : (
                            <>
                              <div className={styles.memoriesLabel}>PHOTOS</div>
                              <div className={styles.memoriesTitle}>{item.fileName || "Collection"}</div>
                            </>
                          )}
                        </div>
                        {!isPdf && (
                          <div className={styles.memoriesCollage}>
                            {displayImages.slice(0, 3).map((img, i) => (
                              <img key={i} src={URL.createObjectURL(img)} className={styles.collageImg} alt="" />
                            ))}
                          </div>
                        )}
                        {isPdf && item.printSettings && (
                          <div className={styles.queueCardFooter}>
                            <div className={styles.queueTitle}>{item.fileName}</div>
                            <div className={styles.queueSubtitle}>{item.printSettings.copies} {item.printSettings.copies === 1 ? "Copy" : "Copies"} · {item.printSettings.colorMode === "color" ? "Color" : "B&W"}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {error && <div className={styles.errorMessage}>{error}</div>}
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM BAR ─── */}
      {!showEmptyState && printQueue.length > 0 && (
        <div className={styles.stickyBottom}>
          <div className={styles.stickyLeft}>
            <span className={styles.stickyLabel}>TOTAL</span>
            <span className={styles.stickyAmount}>₹{calculateTotalCost()}</span>
          </div>
          <button className={styles.stickyProceedBtn} onClick={handleUpload} disabled={loading}>
            {loading ? "Uploading..." : (<><span>PROCEED</span><ChevronRight size={18} strokeWidth={2.5} /></>)}
          </button>
        </div>
      )}

      {/* ─── PDF Settings Modal (UPDATED) ─── */}
      {showPdfSettings && selectedPdf && (
        <div className={styles.fullscreenModal}>
          <div className={styles.fullscreenContent}>

            {/* Header */}
            <div className={styles.fullscreenHeader}>
              <button className={styles.backBtn} onClick={() => setShowPdfSettings(false)}>
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <div className={styles.pdfHeaderInfo}>
                <span className={styles.pdfHeaderName}>
                  {selectedPdf.name.length > 22 ? `${selectedPdf.name.substring(0, 22)}…` : selectedPdf.name}
                </span>
                <span className={styles.pdfHeaderMeta}>{pdfPageCount} pages · {(selectedPdf.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className={styles.headerSpacer} />
            </div>

            {/* ── PDF VIEWER (scrollable, top section) ── */}
            <div className={styles.pdfViewerSection}>
              <div className={styles.pdfViewerInner}>
                {pagesToDisplay.length === 0 && allPdfPages.length === 0 ? (
                  <div className={styles.pdfViewerLoading}>
                    <div className={styles.pdfViewerSpinner} />
                    <span>Loading pages…</span>
                  </div>
                ) : pagesToDisplay.length === 0 && settings.pageRange === "custom" ? (
                  <div className={styles.pdfViewerLoading}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    <span>Enter page range to preview</span>
                  </div>
                ) : (
                  <div className={styles.pdfViewerScroll}>
                    {pagesToDisplay.map((page, index) => {
                      // Detect orientation
                      const isLandscape = page.canvas.width > page.canvas.height
                      return (
                        <div key={index} className={`${styles.pdfViewerPage} ${isLandscape ? styles.pdfPageLandscape : styles.pdfPagePortrait}`}>
                          <div className={styles.pdfPageLabel}>pg {page.pageNumber}</div>
                          <canvas
                            ref={(canvas) => {
                              if (canvas && page.canvas) {
                                const ctx = canvas.getContext("2d")
                                if (!ctx) return
                                canvas.width = page.canvas.width
                                canvas.height = page.canvas.height
                                ctx.drawImage(page.canvas, 0, 0)
                                canvas.style.filter = settings.colorMode === "bw" ? "grayscale(100%)" : "none"
                              }
                            }}
                            className={styles.pdfViewerCanvas}
                          />
                        </div>
                      )
                    })}
                    {pdfPageCount > 10 && settings.pageRange === "all" && (
                      <div className={styles.pdfMorePages}>
                        +{pdfPageCount - 10} more pages
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── PRINT OPTIONS (compact, below viewer) ── */}
            <div className={styles.pdfOptionsSection}>

              {/* Row 1: Copies + Pages */}
              <div className={styles.optionsRow}>
                {/* Copies */}
                <div className={styles.optionBlock}>
                  <div className={styles.optionLabel}>COPIES</div>
                  <div className={styles.copiesControl}>
                    <button className={styles.copiesBtn} onClick={() => setSettings(s => ({ ...s, copies: Math.max(1, s.copies - 1) }))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <span className={styles.copiesVal}>{settings.copies}</span>
                    <button className={styles.copiesBtn} onClick={() => setSettings(s => ({ ...s, copies: Math.min(99, s.copies + 1) }))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                </div>

                {/* Pages */}
                <div className={styles.optionBlock}>
                  <div className={styles.optionLabel}>PAGES</div>
                  <div className={styles.pagesToggle}>
                    <button
                      className={`${styles.pagesToggleBtn} ${settings.pageRange === "all" ? styles.pagesToggleActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, pageRange: "all" }))}
                    >All</button>
                    <button
                      className={`${styles.pagesToggleBtn} ${settings.pageRange === "custom" ? styles.pagesToggleActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, pageRange: "custom" }))}
                    >Custom</button>
                  </div>
                </div>
              </div>

              {/* Custom range input */}
              {settings.pageRange === "custom" && (
                <div className={styles.customRangeRow}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,107,71,0.8)" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 17h7m-3.5-3.5v7" /></svg>
                  <input
                    type="text"
                    placeholder="e.g. 1-5, 8, 11-13"
                    value={settings.customPages}
                    onChange={(e) => setSettings(s => ({ ...s, customPages: e.target.value }))}
                    className={styles.customRangeInput}
                  />
                </div>
              )}

              {/* Row 2: Color + Duplex */}
              <div className={styles.optionsRow}>
                {/* Color Mode */}
                <div className={styles.optionBlock}>
                  <div className={styles.optionLabel}>COLOR MODE</div>
                  <div className={styles.modeButtons}>
                    <button
                      className={`${styles.modeBtn} ${settings.colorMode === "color" ? styles.modeBtnActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, colorMode: "color" }))}
                      title="Color"
                    >
                      {/* Colorful circle SVG */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 2a10 10 0 0 1 0 20" fill="#ff6b47" opacity="0.8" />
                        <path d="M12 2A10 10 0 0 0 2 12h10z" fill="#3b82f6" opacity="0.8" />
                        <path d="M2 12a10 10 0 0 0 10 10V12z" fill="#22c55e" opacity="0.8" />
                      </svg>
                      <span>Color</span>
                      <span className={styles.modeBtnPrice}>₹10/pg</span>
                    </button>
                    <button
                      className={`${styles.modeBtn} ${settings.colorMode === "bw" ? styles.modeBtnActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, colorMode: "bw" }))}
                      title="Black & White"
                    >
                      {/* B&W halved circle SVG */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 2a10 10 0 0 1 0 20z" fill="#ffffff" />
                        <path d="M12 2A10 10 0 0 0 12 22z" fill="#111111" />
                      </svg>
                      <span>B&amp;W</span>
                      <span className={styles.modeBtnPrice}>₹2/pg</span>
                    </button>
                  </div>
                </div>

                {/* Duplex */}
                <div className={styles.optionBlock}>
                  <div className={styles.optionLabel}>DUPLEX</div>
                  <div className={styles.modeButtons}>
                    <button
                      className={`${styles.modeBtn} ${settings.doubleSided === "one-side" ? styles.modeBtnActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, doubleSided: "one-side" }))}
                      title="One-Sided"
                    >
                      {/* Single page SVG */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="5" y="3" width="14" height="18" rx="1" />
                        <line x1="9" y1="8" x2="15" y2="8" opacity="0.5" />
                        <line x1="9" y1="11" x2="15" y2="11" opacity="0.5" />
                        <line x1="9" y1="14" x2="12" y2="14" opacity="0.5" />
                      </svg>
                      <span>1-Side</span>
                    </button>
                    <button
                      className={`${styles.modeBtn} ${settings.doubleSided === "both-sides" ? styles.modeBtnActive : ""}`}
                      onClick={() => setSettings(s => ({ ...s, doubleSided: "both-sides" }))}
                      title="Double-Sided"
                    >
                      {/* Two pages SVG */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="5" width="12" height="16" rx="1" />
                        <rect x="9" y="3" width="12" height="16" rx="1" fill="rgba(255,107,71,0.15)" />
                        <line x1="6" y1="9" x2="12" y2="9" opacity="0.5" />
                        <line x1="6" y1="12" x2="12" y2="12" opacity="0.5" />
                      </svg>
                      <span>2-Side</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.fullscreenFooter}>
              <div className={styles.costDisplay}>
                <span className={styles.costLabel}>TOTAL</span>
                <span className={styles.cost}>₹{calculateCost()}</span>
              </div>
              <button className={styles.addToQueueBtn} onClick={handleAddPdfToQueue} disabled={calculateCost() === 0}>
                <Plus size={16} strokeWidth={2.5} />
                <span>ADD TO QUEUE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Print Settings Modal ─── */}
      {showImageSettings && imageFiles.length > 0 && (
        <ImagePrintSettings images={imageUrls} onClose={() => setShowImageSettings(false)} onAddToQueue={handleAddImageToQueue} />
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

      {showShop && (
        <PaperShop kioskId={slug} isDark={isDark} onClose={() => setShowShop(false)} onPaymentSuccess={(otp, queue) => { setShowShop(false); onShopPaymentSuccess?.(otp, queue) }} />
      )}
      {showHelp && <HelpPage kioskId={slug} isDark={isDark} onClose={() => setShowHelp(false)} />}
      {showPolicy && <PolicyPage type={showPolicy} isDark={isDark} onClose={() => setShowPolicy(null)} />}
    </div>
  )
}