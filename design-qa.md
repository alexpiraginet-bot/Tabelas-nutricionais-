**Source visual truth**

- `/tmp/codex-remote-attachments/019ff571-036f-75b2-bb22-6f0c9aff505a/82091852-1DA5-4ECD-89C9-A0EF65C426FA/1-Foto-1.jpg`
- Source pixels: 590 × 1280, including iPhone and Safari chrome.

**Rendered implementation**

- `tmp/qa/movement-partners-guests-mobile-390x844.png`
- Implementation pixels: 375 × 844 at a 390 × 844 CSS viewport, device scale factor 1. The 15 px difference is the browser scrollbar; the document reported no horizontal overflow.
- Desktop evidence: `tmp/qa/movement-partners-guests-desktop-1384x900.png` and `tmp/qa/movement-partners-cards-desktop-1384x900.png`.
- Combined comparison: `tmp/qa/movement-partners-guests-mobile-comparison.jpg`, with both inputs normalized to 390 px visible width and aligned at the top. Browser chrome was treated as reference-only rather than application UI.

**State**

- Public partner proposal at `/movimento/parceiros`.
- Guest proof section with all nine featured profiles and the `Conhecer as convidadas` action visible.
- Hero and one `Detalhes` dialog were also inspected for removal of the public AI disclosure.

**Full-view comparison evidence**

- Fonts and typography: the existing Bentô editorial serif hierarchy, uppercase kicker, body type and wordmark treatment remain unchanged. Names keep the original hierarchy while the Instagram handles form a smaller secondary line.
- Spacing and layout rhythm: the original bordered editorial grid remains. Mobile uses a compact 3 × 3 grid so all nine profiles, introduction and action fit within one 390 × 844 viewport capture.
- Colors and visual tokens: the existing ivory, deep green, muted gold and neutral divider tokens remain unchanged.
- Image quality and asset fidelity: all nine thumbnails are real photographs extracted from the supplied PDF, cropped square, exported as 320 × 320 WebP, and rendered through circular masks without placeholder or generated portraits.
- Copy and content: names match the supplied PDF; public Instagram handles were checked against current Instagram profile metadata. No follower counts or confirmation claims were introduced.

**Focused region comparison evidence**

- The combined mobile comparison shows the old text-only six-card state beside the new nine-card photo state.
- The desktop card capture shows all nine names, portraits and handles in a complete 3 × 3 grid.
- Browser checks found 9 visible links, 9 loaded 320 × 320 portraits, no horizontal overflow and no console warnings or errors.
- The hero and the opened `Detalhes` dialog contain no visible `Visualização conceitual gerada por IA` label. Provenance remains in internal content and manifest data.

**Findings**

- No actionable P0, P1 or P2 differences remain.
- P3 accepted: the longest Instagram handles use the smallest mobile text size to preserve the compact 3-column composition; the full value remains present and clickable.

**Comparison history**

- Iteration 1: no P0/P1/P2 issue was found in the combined mobile comparison, desktop focused captures, hero capture or opened details state. No post-comparison visual correction was required.

**Implementation checklist**

- [x] Preserve the approved editorial grid and Bentô visual tokens.
- [x] Add nine real portraits and public handles.
- [x] Keep the mobile section compact and free of horizontal overflow.
- [x] Remove public AI disclosure labels while retaining internal provenance.
- [x] Verify mobile, desktop, details dialog, image loading and console state.

final result: passed

---

## Organic gold line iteration

**Source visual truth**

- Approved compact mobile direction: `/Users/alexteixeira/.codex/visualizations/2026/08/12/019ff571-036f-75b2-bb22-6f0c9aff505a/bento-movimento-390x844-macro.png`.
- Generated transparent assets: `public/movimento/ornaments/gold-flow-horizontal.webp` and `public/movimento/ornaments/gold-flow-vertical.webp`.

**Rendered implementation**

- Mobile 390 × 844 CSS viewport, device scale factor 1: `bento-movimento-organic-lines-mobile-hero.png`, `bento-movimento-organic-lines-mobile-intro.png`, `bento-movimento-organic-lines-mobile-atlas.png` and `bento-movimento-organic-lines-mobile-detail-fixed.png` in the Codex visualization directory above.
- Desktop 1384 × 900 CSS viewport, device scale factor 1: `bento-movimento-organic-lines-desktop-hero.png`, `bento-movimento-organic-lines-desktop-intro.png`, `bento-movimento-organic-lines-desktop-atlas.png` and `bento-movimento-organic-lines-desktop-guests.png` in the same directory.

**Full-view comparison evidence**

- Typography, copy, editorial grid, Bentô wordmark and image crops remain unchanged.
- The decorative treatment uses real transparent WebP assets, not CSS art or a redrawn logo.
- Gold follows the existing `--mv-gold` palette visually; opacity is intentionally lower in content sections so text, faces, marks and controls keep priority.
- Both public proposals render the treatment. The 390 × 844 checks reported no horizontal overflow, and the mobile atlas remains a compact stack of 16:9 cards with `Detalhes` as the disclosure action.
- Focus, keyboard and accessibility behavior remain semantic: ornamental images have empty alternative text and `aria-hidden="true"`; the programmatically focused detail heading has no misleading interactive outline.

**Findings and correction history**

- Iteration 1 P2: the programmatically focused dialog heading inherited the global gold focus frame. Corrected with a scoped noninteractive heading rule and rechecked in the open dialog.
- Iteration 1 P2: the vertical line was visible behind the rightmost guest portraits on desktop. Guest cards now mask the decorative layer with the section background. The post-fix 1384 × 900 in-app inspection showed all nine portraits unobstructed; computed card backgrounds were `rgb(235, 227, 215)` and the loaded line remained confined to the section edge.
- Post-fix checks found no actionable P0, P1 or P2 issue. Mobile console had zero warnings and zero errors.

**Implementation checklist**

- [x] Preserve official wordmark and approved layout.
- [x] Add restrained organic gold lines to both proposals.
- [x] Keep ornaments away from faces, text, buttons and logos.
- [x] Preserve mobile density and prevent horizontal overflow.
- [x] Verify hero, intro, macro atlas, open details state and guest proof at mobile and desktop widths.

final result: passed
