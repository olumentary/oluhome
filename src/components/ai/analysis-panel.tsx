'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  Send,
  User,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  applyIdentifyFields,
  applyConditionRating,
  applyProvenanceNarrative,
  applyValueEstimate,
} from '@/app/(dashboard)/items/ai-actions';
import type {
  AiAnalysisTypeKey,
  ConversationMessage,
  AnalysisTurnResult,
  IdentifyResponse,
  ConditionResponse,
  ProvenanceResponse,
  ValueEstimateResponse,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Photo {
  id: string;
  caption: string | null;
  isPrimary: boolean;
  thumbnailUrl: string | null;
}

interface AnalysisEntry {
  id: string;
  analysisType: AiAnalysisTypeKey;
  response: unknown;
  messages: ConversationMessage[] | null;
  modelVersion: string | null;
  applied: boolean;
  createdAt: Date;
}

interface ItemData {
  period: string | null;
  style: string | null;
  originCountry: string | null;
  originRegion: string | null;
  makerAttribution: string | null;
  materials: string[] | null;
  condition: string | null;
}

interface AnalysisPanelProps {
  itemId: string;
  photos: Photo[];
  item: ItemData;
  analyses: AnalysisEntry[];
}

const TYPE_LABELS: Record<AiAnalysisTypeKey, string> = {
  identify: 'Identify (Style / Period)',
  condition: 'Condition Assessment',
  provenance: 'Provenance Narrative',
  value_estimate: 'Value Estimate',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  significant: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Strip JSON code blocks from assistant text for display in chat bubbles
function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*\n[\s\S]*?\n\s*```/g, '').trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalysisPanel({ itemId, photos, item, analyses: initialAnalyses }: AnalysisPanelProps) {
  const [analysisType, setAnalysisType] = useState<AiAnalysisTypeKey>('identify');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(() => {
    const primary = photos.find((p) => p.isPrimary);
    return new Set(primary ? [primary.id] : photos.length > 0 ? [photos[0].id] : []);
  });
  const [userContext, setUserContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>(initialAnalyses);

  // Active conversation state
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [activeResult, setActiveResult] = useState<unknown>(null);
  const [activeType, setActiveType] = useState<AiAnalysisTypeKey>('identify');
  const [activeComplete, setActiveComplete] = useState(false);
  const [activeApplied, setActiveApplied] = useState(false);
  const [replyText, setReplyText] = useState('');

  const replyRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of conversation when messages change
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const togglePhoto = useCallback((photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }, []);

  // ------- Start new analysis -------
  const runAnalysis = async () => {
    if (selectedPhotoIds.size === 0) {
      toast.error('Select at least one photo');
      return;
    }

    setLoading(true);
    setActiveAnalysisId(null);
    setActiveMessages([]);
    setActiveResult(null);
    setActiveComplete(false);
    setActiveApplied(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          photoIds: Array.from(selectedPhotoIds),
          analysisType,
          userContext: userContext.trim() || undefined,
        }),
        signal: controller.signal,
      });

      const data: AnalysisTurnResult & { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Analysis failed — please try again');
        return;
      }

      setActiveAnalysisId(data.analysisId);
      setActiveMessages(data.messages);
      setActiveType(analysisType);
      setActiveResult(data.response);
      setActiveComplete(data.complete);

      // Update history list
      const newEntry: AnalysisEntry = {
        id: data.analysisId,
        analysisType,
        response: data.response,
        messages: data.messages,
        modelVersion: null,
        applied: false,
        createdAt: new Date(),
      };
      setAnalyses((prev) => [newEntry, ...prev]);

      if (data.complete) {
        toast.success('Analysis complete');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Analysis timed out — please try again');
      } else {
        toast.error('Analysis failed — please try again');
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  // ------- Send follow-up reply -------
  const sendReply = async () => {
    if (!replyText.trim() || !activeAnalysisId) return;

    const messageText = replyText.trim();
    setReplyText('');
    setLoading(true);

    // Optimistically add user message
    setActiveMessages((prev) => [...prev, { role: 'user', content: messageText }]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: activeAnalysisId,
          message: messageText,
        }),
        signal: controller.signal,
      });

      const data: AnalysisTurnResult & { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send reply');
        // Remove optimistic message
        setActiveMessages((prev) => prev.slice(0, -1));
        return;
      }

      setActiveMessages(data.messages);
      setActiveResult(data.response);
      setActiveComplete(data.complete);

      // Update in history list
      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === activeAnalysisId
            ? { ...a, response: data.response, messages: data.messages }
            : a,
        ),
      );

      if (data.complete) {
        toast.success('Analysis complete');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Reply timed out — please try again');
      } else {
        toast.error('Failed to send reply');
      }
      setActiveMessages((prev) => prev.slice(0, -1));
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  // ------- View a past analysis -------
  const viewAnalysis = (entry: AnalysisEntry) => {
    setActiveAnalysisId(entry.id);
    setActiveMessages(entry.messages ?? []);
    setActiveResult(entry.response);
    setActiveType(entry.analysisType);
    setActiveComplete(entry.response !== null);
    setActiveApplied(entry.applied);
  };

  // ------- Apply handler -------
  const handleApply = async (fn: () => Promise<{ error?: string; success?: boolean }>, analysisId: string) => {
    setApplying(analysisId);
    try {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('AI suggestion applied');
        setAnalyses((prev) =>
          prev.map((a) => (a.id === analysisId ? { ...a, applied: true } : a)),
        );
        if (activeAnalysisId === analysisId) {
          setActiveApplied(true);
        }
      }
    } catch {
      toast.error('Failed to apply suggestion');
    } finally {
      setApplying(null);
    }
  };

  const hasActiveConversation = activeAnalysisId !== null;

  return (
    <div className="space-y-6">
      {/* ---- Trigger section ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            Run Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type selector + run button */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">Analysis Type</label>
              <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AiAnalysisTypeKey)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identify">Identify (Style / Period)</SelectItem>
                  <SelectItem value="condition">Condition Assessment</SelectItem>
                  <SelectItem value="provenance">Provenance Narrative</SelectItem>
                  <SelectItem value="value_estimate">Value Estimate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runAnalysis} disabled={loading || selectedPhotoIds.size === 0}>
              {loading && !hasActiveConversation ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          {/* Photo selector */}
          {photos.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Photos to analyze ({selectedPhotoIds.size} selected)
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => togglePhoto(photo.id)}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                      selectedPhotoIds.has(photo.id)
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    {photo.thumbnailUrl ? (
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.caption ?? 'Item photo'}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        No preview
                      </div>
                    )}
                    {selectedPhotoIds.has(photo.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="size-5 text-primary" />
                      </div>
                    )}
                    {photo.isPrimary && (
                      <span className="absolute bottom-0 left-0 bg-primary/80 px-1 text-[10px] font-medium text-primary-foreground">
                        Primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <AlertCircle className="mr-1 inline size-4" />
              Upload photos first to enable AI analysis.
            </p>
          )}

          {/* User context */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Additional context (optional)
            </label>
            <Textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Share anything you know about this item — where you acquired it, family history, markings you've noticed, etc."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            AI analysis uses Claude API credits
          </p>
        </CardContent>
      </Card>

      {/* ---- Loading shimmer (only for initial analysis with no conversation yet) ---- */}
      {loading && !hasActiveConversation ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />
              Analyzing...
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ---- Conversation thread ---- */}
      {hasActiveConversation && activeMessages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" />
              Conversation
              {activeComplete && (
                <Badge variant="default" className="ml-auto text-xs">Complete</Badge>
              )}
              {!activeComplete && (
                <Badge variant="secondary" className="ml-auto text-xs">In Progress</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {activeMessages.map((msg, i) => {
                // Skip the first user message (it's the auto-generated context)
                if (i === 0 && msg.role === 'user') return null;

                const isAssistant = msg.role === 'assistant';
                const displayText = isAssistant ? stripJsonBlock(msg.content) : msg.content;

                // Don't render empty assistant messages (e.g., only had a JSON block)
                if (isAssistant && !displayText) return null;

                return (
                  <div
                    key={i}
                    className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                      isAssistant ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isAssistant ? <Bot className="size-4" /> : <User className="size-4" />}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-muted/60 text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{displayText}</p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Reply input — shown when conversation is not complete */}
            {!activeComplete && !loading && (
              <div className="flex gap-2 pt-2">
                <Textarea
                  ref={replyRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Answer the question or provide more details..."
                  className="min-h-[60px] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={sendReply}
                  disabled={!replyText.trim()}
                  className="shrink-0 self-end"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ---- Structured result (when complete) ---- */}
      {activeComplete && activeResult ? (
        <ResultRenderer
          entry={{
            id: activeAnalysisId!,
            analysisType: activeType,
            response: activeResult,
            applied: activeApplied,
          }}
          item={item}
          itemId={itemId}
          applying={applying}
          onApply={handleApply}
        />
      ) : null}

      {/* ---- Analysis history ---- */}
      {analyses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((a) => (
                  <TableRow key={a.id} className={activeAnalysisId === a.id ? 'bg-muted/50' : ''}>
                    <TableCell className="text-sm">
                      <Clock className="mr-1 inline size-3.5 text-muted-foreground" />
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[a.analysisType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.applied ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCheck className="mr-1 size-3" />
                          Applied
                        </Badge>
                      ) : a.response !== null ? (
                        <Badge variant="secondary" className="text-xs">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewAnalysis(a)}
                      >
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultRenderer — routes to type-specific renderers
// ---------------------------------------------------------------------------

interface RenderedEntry {
  id: string;
  analysisType: AiAnalysisTypeKey;
  response: unknown;
  applied: boolean;
}

function ResultRenderer({
  entry,
  item,
  itemId,
  applying,
  onApply,
}: {
  entry: RenderedEntry;
  item: ItemData;
  itemId: string;
  applying: string | null;
  onApply: (fn: () => Promise<{ error?: string; success?: boolean }>, analysisId: string) => void;
}) {
  switch (entry.analysisType) {
    case 'identify':
      return (
        <IdentifyResult
          entry={entry}
          data={entry.response as IdentifyResponse}
          item={item}
          itemId={itemId}
          applying={applying}
          onApply={onApply}
        />
      );
    case 'condition':
      return (
        <ConditionResult
          entry={entry}
          data={entry.response as ConditionResponse}
          itemId={itemId}
          applying={applying}
          onApply={onApply}
        />
      );
    case 'provenance':
      return (
        <ProvenanceResult
          entry={entry}
          data={entry.response as ProvenanceResponse}
          itemId={itemId}
          applying={applying}
          onApply={onApply}
        />
      );
    case 'value_estimate':
      return (
        <ValueEstimateResult
          entry={entry}
          data={entry.response as ValueEstimateResponse}
          itemId={itemId}
          applying={applying}
          onApply={onApply}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Identify Result
// ---------------------------------------------------------------------------

function IdentifyResult({
  entry,
  data,
  item,
  itemId,
  applying,
  onApply,
}: {
  entry: RenderedEntry;
  data: IdentifyResponse;
  item: ItemData;
  itemId: string;
  applying: string | null;
  onApply: (fn: () => Promise<{ error?: string; success?: boolean }>, id: string) => void;
}) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    period: true,
    style: true,
    originCountry: true,
    originRegion: true,
    makerAttribution: true,
    materials: true,
  });

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fields: Array<{
    key: string;
    label: string;
    current: string | null;
    suggested: string | null;
  }> = [
    { key: 'period', label: 'Period', current: item.period, suggested: data.period },
    { key: 'style', label: 'Style', current: item.style, suggested: data.style },
    { key: 'originCountry', label: 'Country', current: item.originCountry, suggested: data.origin.country },
    { key: 'originRegion', label: 'Region', current: item.originRegion ?? null, suggested: data.origin.region ?? null },
    { key: 'makerAttribution', label: 'Attribution', current: item.makerAttribution, suggested: data.makerAttribution },
    {
      key: 'materials',
      label: 'Materials',
      current: item.materials?.join(', ') ?? null,
      suggested: data.materials.join(', '),
    },
  ];

  const anySelected = Object.values(selectedFields).some(Boolean);
  const isApplying = applying === entry.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Identification Results</CardTitle>
        <Badge className={CONFIDENCE_COLORS[data.confidence]}>
          {data.confidence} confidence
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.dateRange && (
          <p className="text-sm text-muted-foreground">
            Estimated date range: <span className="font-medium text-foreground">{data.dateRange}</span>
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field) => {
            const differs = field.current !== field.suggested && field.suggested;
            return (
              <div
                key={field.key}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                  differs ? 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-950/20' : ''
                }`}
              >
                <Checkbox
                  checked={selectedFields[field.key]}
                  onCheckedChange={() => toggleField(field.key)}
                  disabled={entry.applied}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground truncate">{field.current ?? '—'}</span>
                    {differs && (
                      <>
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-foreground truncate">{field.suggested}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!entry.applied && (
          <Button
            size="sm"
            disabled={!anySelected || isApplying}
            onClick={() =>
              onApply(
                () => applyIdentifyFields(itemId, entry.id, selectedFields),
                entry.id,
              )
            }
          >
            {isApplying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Apply Selected
          </Button>
        )}

        {entry.applied && (
          <Badge variant="default">
            <CheckCheck className="mr-1 size-3" />
            Applied
          </Badge>
        )}

        {data.comparables.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Comparable Items</h4>
              <ul className="space-y-1">
                {data.comparables.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {c.description}
                    {c.institution && <span className="italic"> — {c.institution}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {data.notes && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Condition Result
// ---------------------------------------------------------------------------

function ConditionResult({
  entry,
  data,
  itemId,
  applying,
  onApply,
}: {
  entry: RenderedEntry;
  data: ConditionResponse;
  itemId: string;
  applying: string | null;
  onApply: (fn: () => Promise<{ error?: string; success?: boolean }>, id: string) => void;
}) {
  const isApplying = applying === entry.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Condition Assessment</CardTitle>
        <Badge className={CONFIDENCE_COLORS[data.rating === 'excellent' || data.rating === 'very_good' ? 'high' : data.rating === 'good' ? 'medium' : 'low']}>
          {CONDITION_LABELS[data.rating]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.overallNotes && (
          <p className="text-sm text-muted-foreground">{data.overallNotes}</p>
        )}

        {data.issues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Issues Found</h4>
            <div className="space-y-2">
              {data.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border px-3 py-2">
                  <Badge className={`mt-0.5 shrink-0 text-xs ${SEVERITY_COLORS[issue.severity]}`}>
                    {issue.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{issue.area}</p>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.restorations.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Restorations Noted</h4>
              <div className="space-y-2">
                {data.restorations.map((r, i) => (
                  <div key={i} className="rounded-md border px-3 py-2">
                    <p className="text-sm font-medium">{r.area}</p>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                    <p className="text-xs text-muted-foreground">Quality: {r.quality}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {data.recommendations.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!entry.applied ? (
          <Button
            size="sm"
            disabled={isApplying}
            onClick={() => onApply(() => applyConditionRating(itemId, entry.id), entry.id)}
          >
            {isApplying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Apply Rating
          </Button>
        ) : (
          <Badge variant="default">
            <CheckCheck className="mr-1 size-3" />
            Applied
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Provenance Result
// ---------------------------------------------------------------------------

function ProvenanceResult({
  entry,
  data,
  itemId,
  applying,
  onApply,
}: {
  entry: RenderedEntry;
  data: ProvenanceResponse;
  itemId: string;
  applying: string | null;
  onApply: (fn: () => Promise<{ error?: string; success?: boolean }>, id: string) => void;
}) {
  const isApplying = applying === entry.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provenance Narrative</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.narrative}</p>
        </div>

        {data.identifiedMarks.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Identified Marks</h4>
              <div className="space-y-2">
                {data.identifiedMarks.map((mark, i) => (
                  <div key={i} className="rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{mark.type}</Badge>
                      <span className="text-xs text-muted-foreground">({mark.location})</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{mark.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {data.suggestedResearch.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Suggested Research</h4>
              <ul className="space-y-1">
                {data.suggestedResearch.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {!entry.applied ? (
          <Button
            size="sm"
            disabled={isApplying}
            onClick={() => onApply(() => applyProvenanceNarrative(itemId, entry.id), entry.id)}
          >
            {isApplying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Use as Provenance Narrative
          </Button>
        ) : (
          <Badge variant="default">
            <CheckCheck className="mr-1 size-3" />
            Applied
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Value Estimate Result
// ---------------------------------------------------------------------------

function ValueEstimateResult({
  entry,
  data,
  itemId,
  applying,
  onApply,
}: {
  entry: RenderedEntry;
  data: ValueEstimateResponse;
  itemId: string;
  applying: string | null;
  onApply: (fn: () => Promise<{ error?: string; success?: boolean }>, id: string) => void;
}) {
  const isApplying = applying === entry.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Value Estimate</CardTitle>
        <Badge className={CONFIDENCE_COLORS[data.confidence]}>
          {data.confidence} confidence
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Estimated Market Value</p>
          <p className="mt-1 text-2xl font-bold">
            ${data.estimatedRange.low.toLocaleString()} — ${data.estimatedRange.high.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{data.currency}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">Basis</h4>
          <p className="text-sm text-muted-foreground">{data.basis}</p>
        </div>

        {data.comparablesSold.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Comparable Sales</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.comparablesSold.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        ${c.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.venue ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.date ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {data.marketNotes && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-1">Market Notes</h4>
              <p className="text-sm text-muted-foreground">{data.marketNotes}</p>
            </div>
          </>
        )}

        {!entry.applied ? (
          <Button
            size="sm"
            disabled={isApplying}
            onClick={() => onApply(() => applyValueEstimate(itemId, entry.id), entry.id)}
          >
            {isApplying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Save as Estimated Valuation
          </Button>
        ) : (
          <Badge variant="default">
            <CheckCheck className="mr-1 size-3" />
            Applied
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
