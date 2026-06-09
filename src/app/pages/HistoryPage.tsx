import { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { getHistory, deleteHistoryItem, clearHistory } from '../lib/historyStorage';
import { DetectionResult, PredictionType } from '../types';
import { getRecommendations } from '../lib/detectionService';
import { Search, Filter, Trash2, Download, Upload, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const downloadReport = async (item: DetectionResult) => {
  // Convert blob image URL to Base64 to ensure it loads offline
  let base64Image = item.imageUrl;
  if (item.imageUrl.startsWith('blob:')) {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Could not convert image to base64:", e);
    }
  }

  const recommendations = getRecommendations(item.prediction);
  const recsHtml = recommendations.map(rec => `
    <div class="rec-item">
      <span class="rec-icon">${rec.icon}</span>
      <p class="rec-text">${rec.text}</p>
    </div>
  `).join('');

  const predictionLabel = item.prediction === 'non-fire' ? 'Non-Fire' : item.prediction.charAt(0).toUpperCase() + item.prediction.slice(1);
  const predictionClass = item.prediction === 'non-fire' ? 'badge-non-fire' : `badge-${item.prediction}`;
  const riskLabel = item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1);
  const riskClass = `badge-${item.riskLevel}`;

  const scoresHtml = item.scores ? `
    <div class="card" style="margin-top: 20px;">
      <h3 style="margin-bottom: 12px; font-size: 14px; font-weight: 700; color: #374151;">Class Probabilities</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${Object.entries(item.scores).map(([cls, score]) => {
          const label = cls === 'non_fire' ? 'Non-Fire' : cls.charAt(0).toUpperCase() + cls.slice(1);
          const barColor = cls === 'fire' ? '#EF4444' : cls === 'smoke' ? '#F59E0B' : '#10B981';
          return `
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                <span>${label}</span>
                <strong>${score.toFixed(1)}%</strong>
              </div>
              <div style="height: 8px; width: 100%; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${score}%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fire Detection System - Detection Report (${item.id})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1f2937;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      line-height: 1.6;
      background-color: #ffffff;
    }
    .header {
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      color: #ef4444;
      letter-spacing: -0.025em;
    }
    .header-title p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #6b7280;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    @media (max-width: 600px) {
      .meta-grid {
        grid-template-columns: 1fr;
      }
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      background-color: #f9fafb;
    }
    .card h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 700;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      font-weight: 600;
    }
    .image-container {
      text-align: center;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      background-color: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 320px;
    }
    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-fire { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-smoke { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-non-fire { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    
    .badge-high { background-color: #fee2e2; color: #991b1b; }
    .badge-medium { background-color: #fef3c7; color: #92400e; }
    .badge-low { background-color: #d1fae5; color: #065f46; }

    .recommendations-title {
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .rec-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 12px;
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .rec-icon {
      font-size: 20px;
      line-height: 1;
    }
    .rec-text {
      margin: 0;
      font-size: 14px;
      color: #4b5563;
    }
    .footer {
      margin-top: 56px;
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">
      <h1>Fire Detection System</h1>
      <p>Detection Report</p>
    </div>
    <div style="font-size: 12px; color: #9ca3af; text-align: right;">
      Report ID: ${item.id}
    </div>
  </div>

  <div class="meta-grid">
    <div class="image-container">
      <img src="${base64Image}" alt="Analyzed Fire Detection Media">
    </div>
    <div class="card">
      <h3>Analysis Summary</h3>
      <div class="detail-row">
        <span class="detail-label">Classification</span>
        <span class="detail-value">
          <span class="badge ${predictionClass}">${predictionLabel}</span>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Confidence Score</span>
        <span class="detail-value" style="color: ${item.prediction === 'fire' ? '#ef4444' : item.prediction === 'smoke' ? '#f59e0b' : '#10b981'}">
          ${item.confidence}%
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Risk Assessment</span>
        <span class="detail-value">
          <span class="badge ${riskClass}">${riskLabel} Risk</span>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp</span>
        <span class="detail-value">${item.timestamp.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Model Version</span>
        <span class="detail-value">${item.scores ? 'fire_detection_v1final.keras' : 'Local Sandbox Model'}</span>
      </div>
      
      ${scoresHtml}
    </div>
  </div>

  <h2 class="recommendations-title">Safety & Action Recommendations</h2>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    ${recsHtml}
  </div>

  <div class="footer">
    Report generated on ${new Date().toLocaleString()}
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Report-${item.id}.html`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Report downloaded successfully!');
};

export function HistoryPage() {
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | PredictionType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getHistory();
    setHistory(data);
  };

  const handleDelete = (id: string) => {
    deleteHistoryItem(id);
    loadHistory();
    toast.success('Item deleted from history');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      clearHistory();
      loadHistory();
      toast.success('History cleared successfully');
    }
  };

  // Filter and search
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter = filterType === 'all' || item.prediction === filterType;
      const matchesSearch =
        searchQuery === '' ||
        item.prediction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [history, filterType, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mb-2">Detection History</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage all your previous fire detection analyses
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={handleClearAll} className="text-destructive shrink-0 w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Search and Filter Bar */}
          <Card className="border-2 bg-card shadow-sm">
            <div className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or prediction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter */}
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="smoke">Smoke</SelectItem>
                    <SelectItem value="non-fire">Non-Fire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {paginatedHistory.length} of {filteredHistory.length} results
              </div>
            </div>
          </Card>

          {/* History Table */}
          <Card className="border-2 bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedHistory.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="group hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="h-16 w-16 overflow-hidden rounded-lg border-2 border-border">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt="Detection"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-muted">
                                <Video className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium ${
                            item.source === 'camera'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                          }`}>
                            {item.source === 'camera' ? (
                              <><Video className="mr-1 h-3 w-3" />Camera</>
                            ) : (
                              <><Upload className="mr-1 h-3 w-3" />Upload</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.id.slice(0, 16)}...</TableCell>
                        <TableCell>
                          <StatusBadge type="prediction" value={item.prediction} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${
                                  item.prediction === 'fire'
                                    ? 'bg-destructive'
                                    : item.prediction === 'smoke'
                                    ? 'bg-warning'
                                    : 'bg-success'
                                }`}
                                style={{ width: `${item.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{item.confidence}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="risk" value={item.riskLevel} />
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadReport(item)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? 'bg-primary' : ''}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}