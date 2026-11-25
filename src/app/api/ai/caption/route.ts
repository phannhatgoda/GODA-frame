import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { one } from "@/lib/db";
import { handle, ok, HttpError } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { getCampaignById } from "@/lib/campaigns";
import { featuresFor } from "@/lib/plans";

const schema = z.object({
  campaignId: z.string().max(40),
  name: z.string().max(120).optional(),
  tone: z.enum(["tu-hao", "vui-ve", "trang-trong"]).default("tu-hao"),
});

const TONE: Record<string, string> = { "tu-hao": "tự hào, truyền cảm hứng", "vui-ve": "vui vẻ, trẻ trung, có emoji", "trang-trong": "trang trọng, lịch sự" };

function fallback(title: string, hashtag: string, name?: string) {
  const tag = hashtag ? `\n\n${hashtag}` : "";
  return [
    `Đã sẵn sàng cho ${title}! Bạn thì sao? 🔥${tag}`,
    `${name ? name + " — " : ""}tự hào là một phần của ${title}. Cùng lan toả nhé! ✨${tag}`,
    `Một khung hình, một tinh thần chung. ${title} — mình đã có mặt.${tag}`,
  ];
}

export const POST = handle(async (req: Request) => {
  rateLimit(req, "caption", 8, 60_000);
  const b = schema.parse(await req.json());
  const c = await getCampaignById(b.campaignId);
  if (!c || c.status !== "published") throw new HttpError(404, "Không tìm thấy");
  const owner = await one<{ plan: string; role: string; features: string }>("SELECT plan, role, features FROM users WHERE id = ?", [c.owner_id]);
  const allowed = owner && (await featuresFor(owner)).aiCaption && c.config.ai.caption;
  if (!allowed) throw new HttpError(403, "Tính năng chưa bật");

  const hashtag = c.theme.hashtag;
  if (!process.env.ANTHROPIC_API_KEY) return ok({ captions: fallback(c.title, hashtag, b.name), source: "template" });

  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { captions: { type: "array", items: { type: "string" } } },
            required: ["captions"],
            additionalProperties: false,
          },
        },
      },
      system:
        "Bạn là copywriter mạng xã hội của một doanh nghiệp Việt Nam. Viết caption tiếng Việt ngắn (tối đa 220 ký tự), tự nhiên, không sáo rỗng, phù hợp đăng Facebook/LinkedIn/Zalo kèm ảnh avatar hoặc thiệp mời của sự kiện. Trả về đúng 3 phương án khác nhau về góc nhìn.",
      messages: [
        {
          role: "user",
          content: [
            `Sự kiện/chiến dịch: ${c.title}`,
            c.theme.subheadline ? `Mô tả: ${c.theme.subheadline}` : "",
            c.theme.caption ? `Thông điệp chính của ban tổ chức: ${c.theme.caption}` : "",
            b.name ? `Người đăng: ${b.name}` : "",
            `Giọng văn: ${TONE[b.tone]}`,
            hashtag ? `Kết thúc mỗi caption bằng hashtag: ${hashtag}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    if (res.stop_reason === "refusal") return ok({ captions: fallback(c.title, hashtag, b.name), source: "template" });
    const text = res.content.find((x) => x.type === "text");
    const parsed = text && text.type === "text" ? (JSON.parse(text.text) as { captions: string[] }) : null;
    const captions = parsed?.captions?.filter((s) => typeof s === "string").slice(0, 3);
    return ok({ captions: captions?.length ? captions : fallback(c.title, hashtag, b.name), source: "ai" });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn("caption rate limited");
    else if (e instanceof Anthropic.APIError) console.error("caption API error", e.status, e.message);
    else console.error(e);
    return ok({ captions: fallback(c.title, hashtag, b.name), source: "template" });
  }
});
