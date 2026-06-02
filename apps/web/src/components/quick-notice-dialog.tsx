"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { MemberActionTarget } from "@/lib/member-actions";
import { postGroupMemberBulkAction } from "@/lib/member-actions";
import { postGroupChatNotice } from "@/lib/group-chat-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_QUICK_NOTICE_TEXT = "Boa tarde";
const GENERAL_TOPIC_ID = 1;

type ForumTopic = {
  messageThreadId: number;
  name: string;
  isClosed: boolean;
};

type QuickNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload:
    | {
        type: "members";
        title: string;
        targets: MemberActionTarget[];
      }
    | {
        type: "group";
        title: string;
        groupId: string;
        isForum: boolean;
      }
    | null;
  onSent?: () => void;
};

export function QuickNoticeDialog({
  open,
  onOpenChange,
  payload,
  onSent,
}: QuickNoticeDialogProps) {
  const [text, setText] = useState(DEFAULT_QUICK_NOTICE_TEXT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [step, setStep] = useState<"topic" | "message">("message");

  const isGroupForum = payload?.type === "group" && payload.isForum;

  useEffect(() => {
    if (!open || !payload) return;
    setText(DEFAULT_QUICK_NOTICE_TEXT);
    setIsSubmitting(false);
    setTopics([]);
    setSelectedTopic(null);
    setStep(isGroupForum ? "topic" : "message");
  }, [open, payload, isGroupForum]);

  useEffect(() => {
    if (!open || payload?.type !== "group" || !payload.isForum) return;

    let cancelled = false;
    fetch(`/api/alerts/groups/${payload.groupId}/forum-topics`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) {
          setTopics(data as ForumTopic[]);
        }
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, payload]);

  const summaryLabel = useMemo(() => {
    if (!payload) return "";
    if (payload.type === "members") {
      return `${payload.targets.length} membro${payload.targets.length === 1 ? "" : "s"}`;
    }
    return payload.title;
  }, [payload]);

  async function handleSend() {
    if (!payload) return;
    if (!text.trim()) {
      toast.error("Digite a mensagem do aviso.");
      return;
    }

    setIsSubmitting(true);
    const loadingId = toast.loading("Enviando aviso rápido...");

    try {
      if (payload.type === "members") {
        const grouped = new Map<string, string[]>();
        for (const target of payload.targets) {
          const current = grouped.get(target.groupId) ?? [];
          current.push(target.telegramUserId);
          grouped.set(target.groupId, current);
        }

        let successCount = 0;
        for (const [groupId, telegramUserIds] of grouped) {
          const result = await postGroupMemberBulkAction(groupId, {
            action: "notice",
            telegramUserIds,
            text: text.trim(),
          });
          successCount += result.successCount;
        }

        toast.success(`Aviso enviado para ${successCount} membro(s).`, {
          id: loadingId,
        });
      } else {
        const messageThreadId =
          payload.isForum && selectedTopic
            ? Number(selectedTopic)
            : payload.isForum
              ? GENERAL_TOPIC_ID
              : undefined;

        await postGroupChatNotice(payload.groupId, text.trim(), messageThreadId);
        toast.success("Aviso enviado para o grupo.", { id: loadingId });
      }

      onOpenChange(false);
      onSent?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar aviso rápido.",
        { id: loadingId },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Aviso Rápido</DialogTitle>
          <DialogDescription>
            {payload.type === "members"
              ? `Enviar aviso para ${summaryLabel}.`
              : `Enviar aviso no grupo ${summaryLabel}.`}
          </DialogDescription>
        </DialogHeader>

        {isGroupForum && step === "topic" ? (
          <div className="space-y-3">
            <Label>Tópico de destino</Label>
            <Select
              value={selectedTopic ?? ""}
              onValueChange={(value) => setSelectedTopic(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tópico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(GENERAL_TOPIC_ID)}>
                  Tópico geral
                </SelectItem>
                {topics.map((topic) => (
                  <SelectItem
                    key={topic.messageThreadId}
                    value={String(topic.messageThreadId)}
                    disabled={topic.isClosed}
                  >
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => setStep("message")}
                disabled={!selectedTopic}
              >
                Continuar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>Mensagem</Label>
            <Textarea
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escreva o aviso rápido..."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={isSubmitting} onClick={handleSend}>
                {isSubmitting ? "Enviando..." : "Enviar aviso"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

