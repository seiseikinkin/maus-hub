import React, { useState } from "react";
import "./ImportExportModal.css";

interface ImportExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (urls: string[]) => Promise<{ success: number; failed: number; errors: string[] }>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [importText, setImportText] = useState("");
    const [importing, setImporting] = useState(false);

    const handleImport = async () => {
        if (!importText.trim()) {
            alert("URLを入力してください。");
            return;
        }

        setImporting(true);

        try {
            const urls = importText
                .split("\n")
                .map((url) => url.trim())
                .filter((url) => url.length > 0);

            if (urls.length === 0) {
                alert("有効なURLが見つかりませんでした。");
                setImporting(false);
                return;
            }

            // モーダルを閉じる
            handleClose();

            const result = await onImport(urls);

            // エラーがあった場合のみメッセージを表示
            if (result.failed > 0) {
                const errorMessage = `インポート結果:\n成功: ${result.success}件\n失敗: ${result.failed}件\n\nエラー詳細:\n${result.errors.join("\n")}`;
                alert(errorMessage);
            }
        } catch (error) {
            console.error("Import error:", error);
            alert("インポート中にエラーが発生しました。");
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setImportText("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>PokePaste インポート</h3>
                    <button className="modal-close-button" onClick={handleClose}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="import-section">
                        <label htmlFor="import-textarea">PokePaste URLを入力してください（改行区切りで複数可）:</label>
                        <textarea
                            id="import-textarea"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="https://pokepast.es/example1&#10;https://pokepast.es/example2&#10;..."
                            rows={8}
                            disabled={importing}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={handleImport} disabled={importing || !importText.trim()} className="import-button">
                        {importing ? "インポート中..." : "インポート"}
                    </button>
                    <button onClick={handleClose} className="cancel-button">
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
};
