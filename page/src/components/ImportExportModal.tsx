import React, { useState } from 'react';
import './ImportExportModal.css';

interface ImportExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (urls: string[]) => Promise<{ success: number; failed: number; errors: string[] }>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
    isOpen,
    onClose,
    onImport,
}) => {
    const [importText, setImportText] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        success: number;
        failed: number;
        errors: string[];
    } | null>(null);

    const handleImport = async () => {
        if (!importText.trim()) {
            alert('URLを入力してください。');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const urls = importText
                .split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);

            if (urls.length === 0) {
                alert('有効なURLが見つかりませんでした。');
                return;
            }

            const result = await onImport(urls);
            setImportResult(result);

            if (result.success > 0) {
                setImportText(''); // 成功した場合はテキストエリアをクリア
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('インポート中にエラーが発生しました。');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setImportText('');
        setImportResult(null);
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
                        <label htmlFor="import-textarea">
                            PokePaste URLを入力してください（改行区切りで複数可）:
                        </label>
                        <textarea
                            id="import-textarea"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="https://pokepast.es/example1&#10;https://pokepast.es/example2&#10;..."
                            rows={8}
                            disabled={importing}
                        />
                    </div>

                    {importResult && (
                        <div className="import-result">
                            <h4>インポート結果</h4>
                            <div className="result-summary">
                                <span className="success-count">成功: {importResult.success}件</span>
                                <span className="failed-count">失敗: {importResult.failed}件</span>
                            </div>
                            
                            {importResult.errors.length > 0 && (
                                <div className="error-list">
                                    <h5>エラー詳細:</h5>
                                    <ul>
                                        {importResult.errors.map((error, index) => (
                                            <li key={index} className="error-item">
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        onClick={handleImport}
                        disabled={importing || !importText.trim()}
                        className="import-button"
                    >
                        {importing ? 'インポート中...' : 'インポート'}
                    </button>
                    <button onClick={handleClose} className="cancel-button">
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
};