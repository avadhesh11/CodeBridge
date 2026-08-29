import { useState, useRef } from "react";
import api from "../utils/api.js";

const templateJSON = {
  questions: [
    {
      title: "Example Question",
      difficulty: "Medium",
      description: "Problem description here.",
      constraints: [
        "1 <= N <= 200000"
      ],
      tags: [
        "array",
        "sliding-window"
      ],
      timeLimit: 2,
      memoryLimit: 256,
      examples: [
        {
          input: "5\n1 2 3 4 5",
          output: "15",
          explanation: "Example explanation."
        }
      ],
      hiddenTestCases: [
        {
          input: "3\n1 2 3",
          output: "6"
        }
      ]
    }
  ]
};

export default function ImportQuestionsModal({ isOpen, onClose, onSuccess, roomId = null, qtype = "private" }) {
  const [step, setStep] = useState("upload"); // upload | preview | importing | success
  const [loadingText, setLoadingText] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templateJSON, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "codebridge_questions_template.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const resetState = () => {
    setStep("upload");
    setLoadingText("");
    setFileName("");
    setPreviewData(null);
    setAllowDuplicates(false);
    setErrorMsg("");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    setErrorMsg("");

    if (!file.name.toLowerCase().endsWith(".json")) {
      setErrorMsg("Invalid file format. Please upload a .json file.");
      return;
    }

    if (file.size === 0) {
      setErrorMsg("The selected file is empty.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum supported size is 10 MB.");
      return;
    }

    setFileName(file.name);
    setLoadingText("Uploading & Parsing JSON...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoadingText("Validating questions structure...");
        const content = event.target.result;
        let parsedData;
        try {
          parsedData = JSON.parse(content);
        } catch (jsonErr) {
          setErrorMsg("Malformed JSON file. Please check syntax and try again.");
          setLoadingText("");
          return;
        }

        const url = roomId ? `question/import/preview?roomId=${roomId}` : "question/import/preview";
        const res = await api("post", url, parsedData);

        if (res.data?.success && res.data.data) {
          setPreviewData(res.data.data);
          setStep("preview");
        } else {
          setErrorMsg(res.data?.message || "Failed to validate questions.");
        }
      } catch (err) {
        console.error("Preview error:", err);
        setErrorMsg(err.response?.data?.message || err.message || "Failed to process import file.");
      } finally {
        setLoadingText("");
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read the file.");
      setLoadingText("");
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.results) return;

    // Filter valid mapped questions
    const validQuestions = previewData.results
      .filter(item => item.status === "valid" || (allowDuplicates && item.status === "duplicate"))
      .map(item => item.mappedQuestion)
      .filter(Boolean);

    if (validQuestions.length === 0) {
      setErrorMsg("No valid questions to import with the current settings.");
      return;
    }

    setLoadingText("Importing questions...");
    setErrorMsg("");

    try {
      const payload = {
        questions: validQuestions,
        allowDuplicates,
        roomId: roomId || undefined,
        qtype: qtype || "private"
      };

      const res = await api("post", "question/import/confirm", payload);

      if (res.data?.success) {
        setImportResult(res.data);
        setStep("success");
        if (onSuccess) onSuccess(res.data);
      } else {
        setErrorMsg(res.data?.message || "Failed to import questions.");
      }
    } catch (err) {
      console.error("Confirm import error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "An error occurred while importing.");
    } finally {
      setLoadingText("");
    }
  };

  const validCount = previewData?.results?.filter(
    r => r.status === "valid" || (allowDuplicates && r.status === "duplicate")
  ).length || 0;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.82)",
      backdropFilter: "blur(6px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "#0d1117",
        border: "1px solid #30363d",
        borderRadius: "12px",
        width: "100%",
        maxWidth: step === "preview" ? "760px" : "560px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
        overflow: "hidden"
      }}>
        {/* HEADER */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#161b22"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>📁</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#e6edf3", fontFamily: "'Syne', sans-serif" }}>
                Import Questions from JSON
              </div>
              <div style={{ fontSize: "0.72rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace" }}>
                {step === "upload" && "Upload a single question or array of questions"}
                {step === "preview" && `Preview & validate (${fileName})`}
                {step === "success" && "Import completed"}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#7d8590",
              fontSize: "1.1rem",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px"
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {errorMsg && (
            <div style={{
              background: "rgba(248, 81, 73, 0.15)",
              border: "1px solid rgba(248, 81, 73, 0.4)",
              borderRadius: "8px",
              padding: "12px 14px",
              color: "#f85149",
              fontSize: "0.78rem",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingText ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#58d4f5", fontFamily: "'JetBrains Mono', monospace" }}>
                {loadingText}
              </div>
            </div>
          ) : step === "upload" ? (
            <div>
              {/* DROPZONE */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #30363d",
                  borderRadius: "10px",
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#161b22",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginBottom: "20px"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: "2.4rem", marginBottom: "10px" }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e6edf3", marginBottom: "6px" }}>
                  Choose a JSON file or drag & drop here
                </div>
                <div style={{ fontSize: "0.75rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace" }}>
                  Accepted format: .json (single question object or questions array)
                </div>
              </div>

              {/* TEMPLATE DOWNLOAD */}
              <div style={{
                background: "#161b22",
                border: "1px solid #21262d",
                borderRadius: "8px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#e6edf3" }}>Need the JSON format?</div>
                  <div style={{ fontSize: "0.72rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace" }}>
                    Download a ready-to-use template with samples & hidden tests
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    background: "#1c2128",
                    border: "1px solid #30363d",
                    color: "#58d4f5",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  ↓ Download JSON Template
                </button>
              </div>
            </div>
          ) : step === "preview" ? (
            <div>
              {/* SUMMARY STATS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "18px" }}>
                <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#7d8590", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Detected</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace" }}>{previewData?.total || 0}</div>
                </div>
                <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#7d8590", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Valid</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#39d353", fontFamily: "'JetBrains Mono', monospace" }}>{previewData?.validCount || 0}</div>
                </div>
                <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#7d8590", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Duplicates</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f0a830", fontFamily: "'JetBrains Mono', monospace" }}>{previewData?.duplicateCount || 0}</div>
                </div>
                <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.68rem", color: "#7d8590", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>Errors</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#f85149", fontFamily: "'JetBrains Mono', monospace" }}>{previewData?.errorCount || 0}</div>
                </div>
              </div>

              {/* DUPLICATE STRATEGY CONTROLS */}
              {previewData?.duplicateCount > 0 && (
                <div style={{
                  background: "rgba(240, 168, 48, 0.1)",
                  border: "1px solid rgba(240, 168, 48, 0.3)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f0a830" }}>
                      ⚠️ {previewData.duplicateCount} question(s) already exist
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#7d8590" }}>
                      Choose whether to skip existing titles or import them anyway
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setAllowDuplicates(false)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "5px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "1px solid",
                        background: !allowDuplicates ? "#f0a830" : "#161b22",
                        color: !allowDuplicates ? "#000" : "#f0a830",
                        borderColor: "#f0a830"
                      }}
                    >
                      Skip Duplicates
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowDuplicates(true)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "5px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "1px solid",
                        background: allowDuplicates ? "#f0a830" : "#161b22",
                        color: allowDuplicates ? "#000" : "#f0a830",
                        borderColor: "#f0a830"
                      }}
                    >
                      Import Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* QUESTIONS PREVIEW LIST */}
              <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {previewData?.results?.map((item) => {
                  const isErr = item.status === "error";
                  const isDup = item.status === "duplicate";
                  const willImport = item.status === "valid" || (allowDuplicates && isDup);

                  const diffColor = {
                    Easy: { bg: "#1a4d2a", text: "#39d353", border: "#39d353" },
                    Medium: { bg: "rgba(240, 168, 48, 0.15)", text: "#f0a830", border: "#f0a830" },
                    Hard: { bg: "rgba(248, 81, 73, 0.15)", text: "#f85149", border: "#f85149" }
                  }[item.difficulty] || { bg: "#161b22", text: "#7d8590", border: "#30363d" };

                  return (
                    <div
                      key={item.index}
                      style={{
                        background: isErr ? "rgba(248, 81, 73, 0.05)" : (isDup ? "rgba(240, 168, 48, 0.05)" : "#161b22"),
                        border: `1px solid ${isErr ? "rgba(248, 81, 73, 0.3)" : (isDup ? "rgba(240, 168, 48, 0.3)" : "#21262d")}`,
                        borderRadius: "8px",
                        padding: "12px 14px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.72rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace" }}>
                            #{item.index}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#e6edf3" }}>
                            {item.title}
                          </span>
                          <span style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: diffColor.bg,
                            color: diffColor.text,
                            border: `1px solid ${diffColor.border}`
                          }}>
                            {item.difficulty}
                          </span>
                        </div>
                        <div>
                          {isErr && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              background: "rgba(248, 81, 73, 0.2)",
                              color: "#f85149",
                              border: "1px solid #f85149",
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              ✕ ERROR
                            </span>
                          )}
                          {isDup && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              background: willImport ? "rgba(240, 168, 48, 0.2)" : "rgba(125, 133, 144, 0.2)",
                              color: willImport ? "#f0a830" : "#7d8590",
                              border: `1px solid ${willImport ? "#f0a830" : "#7d8590"}`,
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              {willImport ? "⚠ DUPLICATE (WILL IMPORT)" : "⊘ DUPLICATE (SKIPPED)"}
                            </span>
                          )}
                          {item.status === "valid" && (
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              background: "rgba(57, 211, 83, 0.15)",
                              color: "#39d353",
                              border: "1px solid #39d353",
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              ✓ VALID
                            </span>
                          )}
                        </div>
                      </div>

                      {/* META (Tags & Samples) */}
                      {!isErr && (
                        <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>
                          <span>📋 {item.sampleCount} sample{item.sampleCount === 1 ? "" : "s"}</span>
                          <span>🔒 {item.hiddenCount} hidden</span>
                          <span>⏱ {item.timeLimit}s</span>
                          {item.tags?.length > 0 && (
                            <span>🏷 {item.tags.join(", ")}</span>
                          )}
                        </div>
                      )}

                      {/* ERROR REASONS */}
                      {isErr && item.errors?.length > 0 && (
                        <div style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(248, 81, 73, 0.1)", borderRadius: "4px" }}>
                          {item.errors.map((err, eIdx) => (
                            <div key={eIdx} style={{ color: "#f85149", fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>
                              • {err}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SUCCESS STATE */
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#39d353", marginBottom: "8px" }}>
                Import Successful!
              </div>
              <div style={{ fontSize: "0.85rem", color: "#e6edf3", marginBottom: "6px" }}>
                Successfully imported <b>{importResult?.importedCount || 0}</b> question(s).
              </div>
              {importResult?.skippedCount > 0 && (
                <div style={{ fontSize: "0.75rem", color: "#7d8590", fontFamily: "'JetBrains Mono', monospace" }}>
                  ({importResult.skippedCount} duplicate or invalid question(s) were skipped)
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          background: "#161b22"
        }}>
          {step === "upload" && (
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "1px solid #30363d",
                color: "#7d8590",
                padding: "8px 18px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("upload")}
                style={{
                  background: "transparent",
                  border: "1px solid #30363d",
                  color: "#7d8590",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                style={{
                  background: validCount > 0 ? "#39d353" : "#30363d",
                  border: "none",
                  color: validCount > 0 ? "#000" : "#7d8590",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: validCount > 0 ? "pointer" : "not-allowed",
                  boxShadow: validCount > 0 ? "0 0 16px rgba(57, 211, 83, 0.3)" : "none"
                }}
              >
                Import {validCount} Question{validCount === 1 ? "" : "s"} →
              </button>
            </>
          )}

          {step === "success" && (
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "#39d353",
                border: "none",
                color: "#000",
                padding: "8px 22px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(57, 211, 83, 0.35)"
              }}
            >
              View Questions ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
