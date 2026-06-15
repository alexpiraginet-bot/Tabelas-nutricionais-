#!/usr/bin/env python3
# Gera public/portfolio-bento.pdf — CATÁLOGO premium de produtos para parceiros.
# Estilo: capa + grades de produtos (foto + nome + specs + descrição individual) + contato.
from PIL import Image, ImageDraw, ImageFont
import os

BG=(241,236,221); SURF=(251,248,238); INK=(31,35,23); SOFT=(96,100,84)
PIST=(92,107,58); GOLD=(196,168,130); LINE=(217,210,189)
W,H=1240,1754  # A4 @150dpi
SERIF="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIFB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANSB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def F(p,s): return ImageFont.truetype(p,s)

def page(): im=Image.new("RGB",(W,H),BG); return im,ImageDraw.Draw(im)
def center(d,y,t,f,fill):
    w=d.textlength(t,font=f); d.text(((W-w)/2,y),t,font=f,fill=fill)
def wrap(d,t,f,maxw):
    out=[]; cur=""
    for word in t.split():
        s=(cur+" "+word).strip()
        if d.textlength(s,font=f)<=maxw: cur=s
        else: out.append(cur); cur=word
    if cur: out.append(cur)
    return out
def para(d,x,y,t,f,fill,maxw,lh,maxlines=99):
    lines=wrap(d,t,f,maxw)[:maxlines]
    for ln in lines: d.text((x,y),ln,font=f,fill=fill); y+=lh
    return y
def rrect(d,box,r,fill=None,outline=None,width=1):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)
def cover_img(base,path,x,y,w,h,r=14):
    im=Image.open(path).convert("RGB")
    ar=w/h; iar=im.width/im.height
    if iar>ar:
        nw=int(im.height*ar); im=im.crop(((im.width-nw)//2,0,(im.width+nw)//2,im.height))
    else:
        nh=int(im.width/ar); im=im.crop((0,(im.height-nh)//2,im.width,(im.height+nh)//2))
    im=im.resize((w,h),Image.LANCZOS)
    mask=Image.new("L",(w,h),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,w,h],r,fill=255)
    base.paste(im,(x,y),mask)

def header(base,d,tag,idx):
    d.text((90,86),tag,font=F(SANSB,30),fill=INK)
    lbl="CATÁLOGO · PARCEIROS"; f=F(SANS,20)
    d.text((W-90-d.textlength(lbl,font=f),96),lbl,font=f,fill=GOLD)
    d.line([(90,140),(W-90,140)],fill=LINE,width=2)
    center(d,H-58,f"Bentô Gelatos · bentogelateria.com",F(SANS,20),SOFT)
    center(d,H-34,idx,F(SANS,18),GOLD)

def cell(base,d,x,y,cw,ch,name,sabor,specs,desc,photo,accent):
    ph=232
    if photo and os.path.exists(photo):
        cover_img(base,photo,x,y,cw,ph)
    else:
        blk=Image.new("RGB",(cw,ph),accent); mask=Image.new("L",(cw,ph),0)
        ImageDraw.Draw(mask).rounded_rectangle([0,0,cw,ph],14,fill=255); base.paste(blk,(x,y),mask)
        center2=x+cw/2
        t="BENTÔ"; f=F(SERIFB,40); d.text((center2-d.textlength(t,font=f)/2,y+ph/2-46),t,font=f,fill=(255,255,255))
        t2="LANÇAMENTO EM BREVE"; f2=F(SANSB,20); d.text((center2-d.textlength(t2,font=f2)/2,y+ph/2+8),t2,font=f2,fill=(255,255,255))
    d.text((x,y+ph+6),"Imagem meramente ilustrativa",font=F(SANS,15),fill=(155,153,138))
    yy=y+ph+32
    for ln in wrap(d,name,F(SERIFB,32),cw)[:2]:
        d.text((x,yy),ln,font=F(SERIFB,32),fill=INK); yy+=40
    d.line([(x,yy+2),(x+64,yy+2)],fill=GOLD,width=3); yy+=20
    if sabor: d.text((x,yy),sabor,font=F(SANS,21),fill=PIST); yy+=34
    if specs:
        for ln in wrap(d,specs,F(SANSB,22),cw)[:2]:
            d.text((x,yy),ln,font=F(SANSB,22),fill=INK); yy+=30
    yy+=6
    if desc: para(d,x,yy,desc,F(SANS,20),SOFT,cw,28,maxlines=6)

# ---------- conteúdo ----------
PIC=[
 dict(name="Pistache & Choco Branco",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="10 g proteína · 61 kcal · 0 g açúcar adicionado",
      desc="Pasta de pistache selecionada, cobertura de chocolate branco e pistaches inteiros. O campeão da linha: 10 g de proteína com apenas 61 kcal.",
      photo="public/sabores/bentole-pistache-cb.jpg"),
 dict(name="Chocolate Dubai",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="10 g proteína · 108 kcal · 0,1 g açúcar adicionado",
      desc="Cacau escuro, creme de pistache, stracciatella e kadaif crocante. A tendência do Dubai em formato mini picolé proteico.",
      photo="public/sabores/bentole-choco-dubai.jpg"),
 dict(name="Opereta",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="9,9 g proteína · 86 kcal · sem açúcar adicionado",
      desc="Chocolate branco Latissimo com castanhas selecionadas. Elegante, crocante e sofisticado.",
      photo="public/sabores/bentole-opereta.jpg"),
 dict(name="Snickers",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="9,6 g proteína · 95 kcal · sem açúcar adicionado",
      desc="Amendoim real, doce de leite zero açúcar e chocolate 70%. Inspirado no clássico, em versão proteica.",
      photo="public/sabores/bentole-snickers.jpg"),
 dict(name="Prestígio",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="8 g proteína · 91 kcal · sem açúcar adicionado",
      desc="Coco cremoso com cobertura de chocolate. O clássico Prestígio reinventado em mini picolé proteico.",
      photo="public/sabores/bentole-prestigio.jpg"),
 dict(name="Franuí",sabor="Picolé proteico · P 55 g e G 110 g",
      specs="1,2 g proteína · 42 kcal · 7,7 g de fibra",
      desc="Framboesa real, colágeno e cobertura dupla de chocolate. O mais leve e frutado da linha — apenas 42 kcal.",
      photo="public/sabores/bentole-franui.jpg"),
 dict(name="Magnésio + Inositol Relief 3.0",sabor="Lançamento em breve",
      specs="",desc="",
      photo="public/sabores/bentole-magnesio.jpg",accent=(214,138,58)),
]
POTES=[
 dict(name="Chocolate Dubai",sabor="Pote selado · 140 ml",specs="12 g proteína · sem açúcar adicionado",
      desc="Chocolate com creme crocante e granela crocante. O Dubai em pote selado, pronto para vitrine e delivery."),
 dict(name="Pistache",sabor="Pote selado · 140 ml",specs="10 g proteína · sem açúcar adicionado",
      desc="Pistache mesclado e granela. Pasta de pistache italiana selecionada, sabor intenso e cor natural."),
 dict(name="Doce de Leite",sabor="Pote selado · 140 ml",specs="11 g proteína · sem açúcar adicionado",
      desc="Doce de leite mesclado e granela. O sabor afetivo brasileiro, zero açúcar adicionado, com whey WPH."),
]

def grid_page(tag,intro,items,idx):
    im,d=page(); header(im,d,tag,idx)
    d.text((90,180),intro[0],font=F(SERIFB,40),fill=INK)
    d.text((90,232),intro[1],font=F(SERIFB,40),fill=INK)
    gx=90; gy=320; cw=(W-180-40)//2; ch=640; gapx=40; gapy=40
    for i,it in enumerate(items[:4]):
        cx=gx+(i%2)*(cw+gapx); cy=gy+(i//2)*(ch+gapy)
        cell(im,d,cx,cy,cw,ch,it["name"],it["sabor"],it["specs"],it["desc"],it.get("photo"),it.get("accent",PIST))
    return im

pages=[]
# capa
cover,d=page()
try:
    logo=Image.open("public/bento-logo.png").convert("RGBA").resize((220,220),Image.LANCZOS)
    cover.paste(logo,((W-220)//2,330),logo)
except Exception as e: print("logo:",e)
center(d,600,"B E N T Ô   G E L A T O S",F(SANS,26),PIST)
center(d,656,"Catálogo de Produtos",F(SERIFB,82),INK)
center(d,778,"Linha proteica · sem açúcar adicionado · rótulo limpo",F(SANS,30),SOFT)
d.line([(W/2-120,856),(W/2+120,856)],fill=GOLD,width=3)
center(d,912,"Apresentação para parceiros",F(SANS,28),INK)
center(d,H-150,"Vitória — ES · Praia do Canto · Jardim Camburi",F(SANS,24),SOFT)
center(d,H-104,"bentogelateria.com · (27) 99915-9995",F(SANS,24),GOLD)
pages.append(cover)

# picolés (2 páginas de 4)
pages.append(grid_page("Linha Bentôlé — Picolés Proteicos",("A linha de picolés","mais desejada — agora proteica."),PIC[:4],"02 · Picolés"))
pages.append(grid_page("Linha Bentôlé — Picolés Proteicos",("Sabores que","você já ama, sem açúcar."),PIC[4:],"03 · Picolés"))

# potes (hero + 3 linhas)
pim,d=page(); header(pim,d,"Linha Vitrine — Potes 140 ml","04 · Potes")
d.text((90,180),"Gelato proteico em",font=F(SERIFB,40),fill=INK)
d.text((90,232),"pote selado de 140 ml.",font=F(SERIFB,40),fill=INK)
cover_img(pim,"public/portfolio/potes-140.jpg",90,300,W-180,360,16)
d.text((90,666),"Imagem meramente ilustrativa",font=F(SANS,16),fill=(155,153,138))
yy=700
for it in POTES:
    rrect(d,[90,yy,W-90,yy+260],14,fill=SURF,outline=LINE,width=2)
    d.text((120,yy+28),it["name"],font=F(SERIFB,34),fill=INK)
    d.line([(122,yy+78),(122+64,yy+78)],fill=GOLD,width=3)
    d.text((120,yy+92),it["sabor"],font=F(SANS,21),fill=PIST)
    d.text((120,yy+126),it["specs"],font=F(SANSB,23),fill=INK)
    para(d,120,yy+166,it["desc"],F(SANS,21),SOFT,W-240,29,maxlines=3)
    yy+=290
pages.append(pim)

# contato
last,d=page()
center(d,150,"Vamos ser parceiros?",F(SERIFB,58),INK)
d.line([(W/2-120,250),(W/2+120,250)],fill=GOLD,width=3)
center(d,290,"Lojas de suplementos · academias · empórios · cafeterias · mercados premium",F(SANS,24),SOFT)
bullets=[("Premium","Estética sofisticada e percepção de valor acima do congelado comum."),
 ("Proteico","Whey WPH — diálogo direto com o público fitness e wellness."),
 ("Sem açúcar adicionado","Rótulo limpo, opções low-carb e para controle glicêmico."),
 ("Margem atrativa","Programa de revenda com margens de 30% a 50%.")]
y=380
for t,desc in bullets:
    d.ellipse([140,y+8,160,y+28],fill=PIST)
    d.text((185,y),t,font=F(SANSB,32),fill=INK)
    d.text((185,y+44),desc,font=F(SANS,25),fill=SOFT); y+=120
rrect(d,[120,y+30,W-120,y+250],16,fill=(235,227,206))
d.text((160,y+58),"Fale com a gente",font=F(SANSB,34),fill=PIST)
d.text((160,y+112),"WhatsApp  (27) 99915-9995",font=F(SANS,30),fill=INK)
d.text((160,y+156),"bentogelateria@gmail.com",font=F(SANS,30),fill=INK)
d.text((160,y+200),"bentogelateria.com",font=F(SANS,30),fill=INK)
center(d,H-70,"© Bentô Gelatos · ABB Gelateria Ltda · Vitória — ES",F(SANS,22),SOFT)
pages.append(last)

pages[0].save("public/portfolio-bento.pdf","PDF",save_all=True,append_images=pages[1:],resolution=150.0)
print("PDF gerado:",os.path.getsize("public/portfolio-bento.pdf")//1024,"KB ·",len(pages),"páginas")
