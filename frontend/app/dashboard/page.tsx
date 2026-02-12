"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Upload, FileAudio, CheckCircle, Loader2, Download, FileText, AlertCircle, ArrowLeft, FileType, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

// Simple UI Components
const Button = ({ children, className, ...props }: any) => (
    <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-slate-950 px-4 py-2 ${className}`} {...props}>
        {children}
    </button>
)
const Card = ({ children, className }: any) => <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
const CardHeader = ({ children, className }: any) => <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
const CardTitle = ({ children, className }: any) => <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
const CardContent = ({ children, className }: any) => <div className={`p-6 pt-0 ${className}`}>{children}</div>
const CardDescription = ({ children, className }: any) => <p className={`text-sm text-slate-400 ${className}`}>{children}</p>
const Input = ({ className, ...props }: any) => <input className={`flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-slate-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
const Label = ({ children, className, ...props }: any) => <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>{children}</label>
const Textarea = ({ className, ...props }: any) => <textarea className={`flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />

export default function DashboardPage() {
    const searchParams = useSearchParams()
    const type = searchParams.get("type") || "doctor"
    const isHR = type === "hr"

    const [file, setFile] = useState<File | null>(null)

    // Custom Template State
    const [useCustomTemplate, setUseCustomTemplate] = useState(false)
    const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null)
    const [customTemplateId, setCustomTemplateId] = useState<string | null>(null)

    const [isUploading, setIsUploading] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [parsedData, setParsedData] = useState<Record<string, string>>({})
    const [placeholders, setPlaceholders] = useState<string[]>([])
    const [step, setStep] = useState<"upload" | "processing" | "review" | "done">("upload")
    const [error, setError] = useState("")

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setError("")
        }
    }

    const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCustomTemplateFile(e.target.files[0])
        }
    }

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
            const res = await fetch("http://localhost:8000/transcribe", {
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

            const res = await fetch("http://localhost:8000/generate-docx", {
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

    const handleInputChange = (key: string, value: string) => {
        setParsedData(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/" className="p-2 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className={`text-3xl font-bold bg-gradient-to-r ${isHR ? 'from-purple-400 to-pink-400' : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent`}>
                                {isHR ? "HR Document Studio" : "Medical Consultation Studio"}
                            </h1>
                            <p className="text-slate-400 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> AI Engine Online
                            </p>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full border ${isHR ? 'border-purple-500/20 bg-purple-500/10 text-purple-300' : 'border-blue-500/20 bg-blue-500/10 text-blue-300'} text-xs font-mono tracking-wide uppercase`}>
                        {type} WORKSPACE
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {step === "upload" && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-xl mx-auto mt-10"
                        >
                            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden">
                                <CardHeader className="text-center p-8 pb-4">
                                    <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${isHR ? 'from-purple-500/20 to-purple-500/5 text-purple-400' : 'from-blue-500/20 to-blue-500/5 text-blue-400'}`}>
                                        <Upload size={40} strokeWidth={1.5} />
                                    </div>
                                    <CardTitle className="text-2xl text-slate-100">Upload Files</CardTitle>
                                    <CardDescription className="text-slate-400">Audio is required. Template is optional.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-0 space-y-6">

                                    {/* Audio Upload */}
                                    <div className="relative group cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]">
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                        />
                                        <div className={`border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center transition-all duration-300 group-hover:border-${isHR ? 'purple' : 'blue'}-500/50 group-hover:bg-slate-800/80 bg-slate-900/50`}>
                                            {file ? (
                                                <div className="flex flex-col items-center justify-center gap-3 text-slate-200 animate-in fade-in zoom-in duration-300">
                                                    <FileAudio size={40} className={`text-${isHR ? 'purple' : 'blue'}-400 drop-shadow-lg`} />
                                                    <span className="font-medium text-lg max-w-[200px] truncate">{file.name}</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-slate-300 font-medium text-lg">Select Audio Recording</p>
                                                    <p className="text-xs text-slate-500">MP3, M4A, WAV supported</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Template Option */}
                                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Settings size={18} className="text-slate-400" />
                                                <label className="text-sm font-medium text-slate-300 cursor-pointer select-none" htmlFor="custom-template-check">
                                                    Use Custom Template (.docx)
                                                </label>
                                            </div>
                                            <input
                                                id="custom-template-check"
                                                type="checkbox"
                                                checked={useCustomTemplate}
                                                onChange={(e) => setUseCustomTemplate(e.target.checked)}
                                                className={`w-5 h-5 rounded border-slate-700 bg-slate-900 text-${isHR ? 'purple' : 'blue'}-600 focus:ring-${isHR ? 'purple' : 'blue'}-500/50`}
                                            />
                                        </div>

                                        <AnimatePresence>
                                            {useCustomTemplate && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2">
                                                        <div className="relative group cursor-pointer">
                                                            <input
                                                                type="file"
                                                                accept=".docx"
                                                                onChange={handleTemplateFileChange}
                                                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                                            />
                                                            <div className={`border border-dashed border-slate-700 rounded-lg p-4 text-center hover:bg-slate-900 transition-colors ${!customTemplateFile ? 'text-slate-500' : 'text-slate-200 border-green-500/50 bg-green-500/10'}`}>
                                                                {customTemplateFile ? (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <FileType size={16} />
                                                                        <span className="text-sm truncate">{customTemplateFile.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2 text-sm">
                                                                        <Upload size={14} />
                                                                        <span>Upload .docx template</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                                                            Use placeholders like [Patient Name] in your Word doc.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-3 text-red-300 text-sm bg-red-950/30 border border-red-900/50 p-4 rounded-xl animate-in slide-in-from-top-2">
                                            <AlertCircle size={18} className="shrink-0" /> {error}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleUpload}
                                        disabled={!file || (useCustomTemplate && !customTemplateFile)}
                                        className={`w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r ${isHR
                                                ? 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20'
                                                : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20'
                                            } text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                                    >
                                        Start Analysis
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {step === "processing" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-[60vh]"
                        >
                            <div className="relative mb-12">
                                <div className={`absolute inset-0 bg-${isHR ? 'purple' : 'blue'}-500 blur-3xl opacity-20 animate-pulse rounded-full w-32 h-32`}></div>
                                <div className="relative z-10 bg-slate-900 p-8 rounded-full border border-slate-800 shadow-2xl">
                                    <Loader2 size={64} className={`text-${isHR ? 'purple' : 'blue'}-400 animate-spin`} />
                                </div>
                            </div>
                            <h2 className="text-4xl font-bold text-slate-100 mb-4 tracking-tight">AI Analysis in Progress</h2>
                            <div className="space-y-2 text-center text-slate-400">
                                <p>Transcribing audio content...</p>
                                {useCustomTemplate ? (
                                    <p className="text-green-400 text-sm">Analyzing custom template structure...</p>
                                ) : (
                                    <p className="text-slate-500 text-sm">Parsing entities and terminology...</p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === "review" && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]"
                        >
                            {/* Transcript Column */}
                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl">
                                <CardHeader className="bg-slate-900/80 border-b border-slate-800 p-6">
                                    <div className="flex items-center gap-3 text-slate-200">
                                        <div className="p-2 bg-slate-800 rounded-lg">
                                            <FileText size={20} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Live Transcript</CardTitle>
                                            <CardDescription>Raw text from Whisper AI</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <div className="flex-1 overflow-auto p-8 font-mono text-sm text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-slate-700">
                                    {transcript}
                                </div>
                            </Card>

                            {/* Data Form Column */}
                            <Card className={`bg-slate-900/50 border-slate-800 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl border-t-4 border-t-${isHR ? 'purple' : 'blue'}-500`}>
                                <CardHeader className="bg-slate-900/80 border-b border-slate-800 p-6 flex flex-row items-center justify-between sticky top-0 z-10">
                                    <div>
                                        <CardTitle className="text-lg text-slate-100">
                                            {customTemplateId ? "Custom Data Fields" : "Extracted Data"}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {customTemplateId ? "Extracted from your custom template" : "Review fields before generating"}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={handleGenerate}
                                        className={`bg-${isHR ? 'purple' : 'blue'}-600 hover:bg-${isHR ? 'purple' : 'blue'}-500 text-white shadow-lg shadow-${isHR ? 'purple' : 'blue'}-500/20 px-6`}
                                    >
                                        <Download size={18} className="mr-2" /> Generate DOCX
                                    </Button>
                                </CardHeader>
                                <div className="flex-1 overflow-auto p-8 space-y-8">
                                    {Object.keys(parsedData).length > 0 ? (
                                        placeholders.map((key) => (
                                            <div key={key} className="space-y-3 group">
                                                <Label htmlFor={key} className={`text-slate-400 text-xs font-bold uppercase tracking-wider transition-colors group-focus-within:text-${isHR ? 'purple' : 'blue'}-400`}>
                                                    {key}
                                                </Label>
                                                <Textarea
                                                    id={key}
                                                    value={parsedData[key] || ""}
                                                    onChange={(e: any) => handleInputChange(key, e.target.value)}
                                                    className="bg-slate-950/50 border-slate-800 focus:border-slate-600 focus:ring-0 min-h-[100px] text-slate-200 resize-y rounded-xl p-4 leading-relaxed transition-all"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                            <AlertCircle size={48} className="opacity-20" />
                                            <p>No valid data parsed. Please try recording again.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {step === "done" && (
                        <motion.div
                            key="done"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center h-[60vh] text-center"
                        >
                            <div className="w-28 h-28 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 text-green-400 animate-[bounce_1s_infinite]">
                                <CheckCircle size={56} />
                            </div>
                            <h2 className="text-5xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent mb-6">Document Ready!</h2>
                            <p className="text-slate-400 text-lg mb-12 max-w-md mx-auto">
                                Your <span className={`text-${isHR ? 'purple' : 'blue'}-400 font-semibold`}>{customTemplateId ? "custom document" : (isHR ? "HR document" : "medical note")}</span> has been successfully generated and downloaded.
                            </p>
                            <div className="flex justify-center gap-6">
                                <Button
                                    onClick={() => {
                                        setStep("upload")
                                        setFile(null)
                                        setCustomTemplateFile(null)
                                        setUseCustomTemplate(false)
                                        setCustomTemplateId(null)
                                    }}
                                    className="h-12 px-8 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all hover:border-slate-600"
                                >
                                    Create New Document
                                </Button>
                                <Button
                                    onClick={() => window.open(`http://localhost:8000/uploads/${file?.name ? 'generated_' + (file.name || 'doc') : ''}.docx`, '_blank')} // Simplified view logic
                                    className={`h-12 px-8 rounded-xl bg-${isHR ? 'purple' : 'blue'}-600 hover:bg-${isHR ? 'purple' : 'blue'}-500 text-white shadow-lg shadow-${isHR ? 'purple' : 'blue'}-500/20`}
                                >
                                    View File
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
