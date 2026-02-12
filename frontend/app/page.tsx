"use client"

import { useState } from "react"
import { Upload, FileAudio, CheckCircle, Loader2, Download, FileText, AlertCircle, FileType, Settings, LayoutTemplate } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Minimal UI Components
const Button = ({ children, className, ...props }: any) => (
  <button className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props}>
    {children}
  </button>
)
const Card = ({ children, className }: any) => <div className={`rounded-2xl border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
const Input = ({ className, ...props }: any) => <input className={`flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50 ${className}`} {...props} />
const Label = ({ children, className, ...props }: any) => <label className={`text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`} {...props}>{children}</label>
const Textarea = ({ className, ...props }: any) => <textarea className={`flex min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-50 ${className}`} {...props} />

export default function App() {
  const [type, setType] = useState<"doctor" | "hr">("doctor")
  const isHR = type === "hr"

  const [file, setFile] = useState<File | null>(null)
  const [useCustomTemplate, setUseCustomTemplate] = useState(false)
  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null)
  const [customTemplateId, setCustomTemplateId] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [parsedData, setParsedData] = useState<Record<string, string>>({})
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [step, setStep] = useState<"upload" | "processing" | "review" | "done">("upload")
  const [error, setError] = useState("")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setStep("processing")
    setError("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("template_type", type)

    if (useCustomTemplate && customTemplateFile) {
      formData.append("template_file", customTemplateFile)
    }

    try {
      const res = await fetch(`${API_URL}/transcribe`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Processing failed - Check backend logs")

      const data = await res.json()
      setTranscript(data.transcript)
      setParsedData(data.data || {})
      setPlaceholders(data.placeholders || [])
      setCustomTemplateId(data.custom_template_id)
      setStep("review")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      setStep("upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async () => {
    try {
      const payload: any = {
        data: parsedData,
        template_type: type
      }
      if (customTemplateId) {
        payload.custom_template_id = customTemplateId
      }

      const res = await fetch(`${API_URL}/generate-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error("Generation failed")

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = customTemplateId ? "custom_document.docx" : `${type}_document_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      setStep("done")
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-white/20">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Minimal Header */}
        <header className="flex flex-col items-center justify-center mb-12 gap-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            AI Document Engine
          </h1>
          <p className="text-slate-500 text-sm">Automated transcription and structuring</p>
        </header>

        {/* Category Switcher - Only show in upload step */}
        {step === "upload" && (
          <div className="flex justify-center mb-10">
            <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex relative">
              <button
                onClick={() => setType("doctor")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${!isHR ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Medical
              </button>
              <button
                onClick={() => setType("hr")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${isHR ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Corporate
              </button>
              <motion.div
                layoutId="tab-bg"
                className="absolute top-1 bottom-1 bg-slate-800 rounded-lg shadow-sm"
                initial={false}
                animate={{
                  left: !isHR ? 4 : "50%",
                  width: "calc(50% - 4px)"
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="max-w-lg mx-auto space-y-8"
            >
              {/* Minimal File Upload */}
              <div className="group relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0])
                      setError("")
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                />
                <div className={`relative z-10 p-10 rounded-3xl border border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center ${file ? 'border-green-500/50 bg-green-900/10' : 'border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700'}`}>
                  {file ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <FileAudio size={24} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-xs text-green-400 mt-1">Ready to process</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors">
                        <Upload size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-300 font-medium">Upload Audio</p>
                        <p className="text-xs text-slate-600">Drag & drop or click to browse</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Template Options */}
              <div className="bg-slate-900/30 rounded-2xl p-5 border border-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <LayoutTemplate size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Template Source</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <span>Use Custom .docx</span>
                    <div className={`w-9 h-5 rounded-full p-1 transition-colors ${useCustomTemplate ? 'bg-green-600' : 'bg-slate-700'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={useCustomTemplate}
                        onChange={(e) => setUseCustomTemplate(e.target.checked)}
                      />
                      <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${useCustomTemplate ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>

                <AnimatePresence>
                  {useCustomTemplate && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative pt-2">
                        <input
                          type="file"
                          accept=".docx"
                          onChange={(e) => e.target.files?.[0] && setCustomTemplateFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                        />
                        <div className={`p-4 rounded-xl border border-dashed text-center transition-colors ${customTemplateFile ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'}`}>
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <FileType size={16} />
                            <span>{customTemplateFile?.name || "Select custom template file"}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex items-center gap-2 justify-center">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || (useCustomTemplate && !customTemplateFile) || isUploading}
                className="w-full h-12 bg-white text-black hover:bg-slate-200 shadow-xl shadow-white/5 rounded-xl text-base font-semibold"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Processing...</div>
                ) : "Start Analysis"}
              </Button>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full w-32 h-32 animate-pulse" />
                <Loader2 size={48} className="text-white animate-spin relative z-10" />
              </div>
              <p className="mt-8 text-slate-400 text-sm tracking-wide uppercase font-medium">Analyzing Audio & Template</p>
              <p className="text-slate-600 text-xs mt-2">This may take a few seconds</p>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {/* Transcript Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-slate-400 px-1">
                  <span className="text-xs uppercase font-semibold tracking-wider">Live Transcript</span>
                  <FileText size={14} />
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-6 border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap h-[500px] overflow-y-auto custom-scrollbar">
                  {transcript}
                </div>
              </div>

              {/* Form Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Extracted Fields</span>
                  <Button
                    onClick={handleGenerate}
                    className="bg-white text-black hover:bg-slate-200 px-4 h-8 text-xs font-semibold shadow-lg shadow-white/5"
                  >
                    <Download size={14} className="mr-2" /> Export DOCX
                  </Button>
                </div>
                <div className="bg-slate-900/40 rounded-2xl p-6 border border-slate-800 h-[500px] overflow-y-auto custom-scrollbar space-y-6">
                  {Object.keys(parsedData).length > 0 ? (
                    placeholders.map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{key}</Label>
                        <Textarea
                          id={key}
                          value={parsedData[key] || ""}
                          onChange={(e: any) => setParsedData({ ...parsedData, [key]: e.target.value })}
                          className="bg-black/40 border-slate-800 focus:border-slate-600 resize-none min-h-[60px]"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                      <p>No fields detected</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-500/20">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-3xl font-medium text-white mb-2">Success</h2>
              <p className="text-slate-400 text-sm mb-8">Document generated successfully</p>

              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    setStep("upload")
                    setFile(null)
                    setCustomTemplateFile(null)
                    setUseCustomTemplate(false)
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 px-6 h-10"
                >
                  Start New
                </Button>
                <Button
                  onClick={() => window.open(`${API_URL}/uploads/${file?.name ? 'generated_' + (file.name || 'doc') : ''}.docx`, '_blank')} // Simplified view logic
                  className="bg-white text-black hover:bg-slate-200 px-6 h-10 shadow-lg shadow-white/10"
                >
                  Download File
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
