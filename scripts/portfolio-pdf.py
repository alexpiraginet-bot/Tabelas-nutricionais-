#!/usr/bin/env python3
# Catálogo editorial premium da Bentô (estilo revista). Gera public/portfolio-bento.pdf.
# - "Sabor como creme" gerado por SVG (arte da marca) com a paleta real de cada sabor.
# - Capa com as caixas em pedestal (poster), páginas de produto, contracapa com QR.
import re, os, io, math, cairosvg, qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

W,H=1240,1754
BG=(239,233,219); SURF=(251,248,238); INK=(31,35,23); SOFT=(96,100,84)
PIST=(92,107,58); GOLD=(196,168,130); LINE=(220,213,193)
SERIF="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIFB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANSB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def F(p,s): return ImageFont.truetype(p,s)
def page(): im=Image.new("RGB",(W,H),BG); return im,ImageDraw.Draw(im)
def tw(d,t,f): return d.textlength(t,font=f)
def cx_text(d,cx,y,t,f,fill): d.text((cx-tw(d,t,f)/2,y),t,font=f,fill=fill)
def wrap(d,t,f,maxw):
    out=[];cur=""
    for w in t.split():
        s=(cur+" "+w).strip()
        if tw(d,s,f)<=maxw: cur=s
        else: out.append(cur); cur=w
    if cur: out.append(cur)
    return out
def para(d,x,y,t,f,fill,maxw,lh,maxlines=99):
    for ln in wrap(d,t,f,maxw)[:maxlines]: d.text((x,y),ln,font=f,fill=fill); y+=lh
    return y
def dots_arc(d,cx,cy,r,a0,a1,n,color,rad=5):
    for i in range(n):
        a=math.radians(a0+(a1-a0)*i/(n-1))
        x=cx+r*math.cos(a); y=cy+r*math.sin(a)
        d.ellipse([x-rad,y-rad,x+rad,y+rad],fill=color)
def img_cover(base,path,x,y,w,h,r=16):
    im=Image.open(path).convert("RGB"); ar=w/h; iar=im.width/im.height
    if iar>ar:
        nw=int(im.height*ar); im=im.crop(((im.width-nw)//2,0,(im.width+nw)//2,im.height))
    else:
        nh=int(im.width/ar); im=im.crop((0,(im.height-nh)//2,im.width,(im.height+nh)//2))
    im=im.resize((w,h),Image.LANCZOS)
    mask=Image.new("L",(w,h),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,w,h],r,fill=255)
    base.paste(im,(x,y),mask)
def paste_png(base,path,x,y,w):
    im=Image.open(path).convert("RGBA"); h=int(im.height*w/im.width); im=im.resize((w,h),Image.LANCZOS)
    base.paste(im,(x,y),im); return h

# ---------- paletas + geração dos cremes ----------
SRC=open("src/data.js").read()
def pal(idkey):
    m=re.search(r'id:"'+re.escape(idkey)+r'"[\s\S]{0,400}?palette:\{base:"(#\w+)",mid:"(#\w+)",deep:"(#\w+)",swirl:"(#\w+)",hl:"(#\w+)"\}',SRC)
    return m.groups() if m else None
PAL_EXTRA={"magnesio":("#F6C66A","#E8A34A","#B5651C","#C9402A","#FFE6B0")}
def hx(c): c=c.lstrip("#"); return tuple(int(c[i:i+2],16) for i in (0,2,4))
# silhueta do creme (arte da Bentô) usada como máscara
_CW,_CH=640,340
_MASK_SVG=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="44 36 132 70" width="{_CW}" height="{_CH}"><path d="M 52 100 Q 58 72 78 70 Q 88 50 105 60 Q 118 42 132 58 Q 148 50 158 72 Q 168 80 168 98 Z" fill="#fff"/></svg>'
_MASK=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=_MASK_SVG.encode()))).convert("L")
# textura real de gelato (Unsplash, uso comercial) — base para todos os sabores
_TEX=ImageOps.autocontrast(Image.open("public/portfolio/cream-texture.jpg").convert("L").resize((_CW,_CH)),cutoff=2)
def _gmap(gray,stops):
    lr=[];lg=[];lb=[]
    for i in range(256):
        t=i/255
        for j in range(len(stops)-1):
            p0,c0=stops[j];p1,c1=stops[j+1]
            if p0<=t<=p1:
                f=(t-p0)/(p1-p0) if p1>p0 else 0
                lr.append(int(c0[0]+(c1[0]-c0[0])*f));lg.append(int(c0[1]+(c1[1]-c0[1])*f));lb.append(int(c0[2]+(c1[2]-c0[2])*f));break
        else:
            lr.append(stops[-1][1][0]);lg.append(stops[-1][1][1]);lb.append(stops[-1][1][2])
    return Image.merge("RGB",(gray.point(lr),gray.point(lg),gray.point(lb)))
os.makedirs("public/portfolio/cream",exist_ok=True)
def cream(idkey):
    base,mid,deep,swirl,hl=[hx(c) for c in (PAL_EXTRA.get(idkey) or pal(idkey))]
    stops=[(0.0,deep),(0.33,mid),(0.66,base),(1.0,hl)]
    col=_gmap(_TEX,stops).convert("RGBA"); col.putalpha(_MASK)
    out=f"public/portfolio/cream/{idkey}.png"; col.save(out)
    return out

PIC=[("Pistache & Choco Branco","10 g proteína · 61 kcal","bentole-pistache-cb",False),
     ("Chocolate Dubai","10 g proteína · 108 kcal","bentole-choco-dubai",False),
     ("Opereta","9,9 g proteína · 86 kcal","bentole-opereta",False),
     ("Snickers","9,6 g proteína · 95 kcal","bentole-snickers",False),
     ("Prestígio","8 g proteína · 91 kcal","bentole-prestigio",False),
     ("Franuí","1,2 g proteína · 42 kcal","bentole-franui",False),
     ("Magnésio + Inositol Relief 3.0","Lançamento em breve","magnesio",True)]
POT=[("Chocolate Dubai","Creme crocante e granela · 12 g prot.","chocolate-dubai"),
     ("Pistache","Pistache mesclado e granela · 10 g prot.","pistache"),
     ("Doce de Leite","Doce de leite e granela · 11 g prot.","doce-de-leite")]

def flavor_cell(base,d,cx,top,creampath,name,spec,cw,soon=False):
    cwid=int(cw*0.82)
    h=Image.open(creampath); h=int(h.height*cwid/h.width)
    # sombra suave
    sh=Image.new("RGBA",(cwid,40),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([cwid*0.12,6,cwid*0.88,30],fill=(60,60,40,60))
    sh=sh.filter(ImageFilter.GaussianBlur(6)); base.paste(sh,(cx-cwid//2,top+h-22),sh)
    paste_png(base,creampath,cx-cwid//2,top,cwid)
    yy=top+h+18
    for ln in wrap(d,name,F(SERIFB,27),cw)[:2]:
        cx_text(d,cx,yy,ln,F(SERIFB,27),INK); yy+=33
    yy+=2
    cx_text(d,cx,yy,spec,F(SANSB,19),(150,90,30) if soon else PIST)

pages=[]
# ============ CAPA ============
c,d=page()
d.text((90,96),"BENTÔ",font=F(SERIFB,104),fill=INK)
d.text((96,210),"G E L A T O S",font=F(SANSB,24),fill=PIST)
try:
    lg=Image.open("public/bento-logo.png").convert("RGBA").resize((132,132),Image.LANCZOS); c.paste(lg,(W-90-132,86),lg)
except Exception as e: print("logo",e)
dots_arc(d,W-150,470,150,-95,5,9,GOLD,5)
hy=300
for i,ln in enumerate(["Sabor de","sobremesa.","Ficha de","suplemento."]):
    col=PIST if i in (1,3) else INK
    d.text((90,hy),ln,font=F(SERIFB,76),fill=col); hy+=92
# hero poster (caixas em pedestal)
img_cover(c,"public/portfolio/picoles-poster.jpg",690,300,470,835,18)
d.text((690,1142),"Imagem meramente ilustrativa",font=F(SANS,16),fill=(150,148,134))
# rodapé
d.line([(90,1300),(W-90,1300)],fill=LINE,width=2)
d.text((90,1340),"Do pré-treino à sobremesa.",font=F(SERIFB,40),fill=INK)
para(d,90,1410,"A Bentô transforma proteína em sobremesa — sem açúcar adicionado, rótulo limpo e whey WPH. Linha de picolés e potes premium para o seu negócio.",F(SANS,24),SOFT,640,34,3)
lbl="PORTFÓLIO · PARCEIROS"; d.text((W-90-tw(d,lbl,F(SANSB,22)),1620),lbl,font=F(SANSB,22),fill=GOLD)
pages.append(c)

# ============ PICOLÉS ============
p,d=page()
d.text((90,90),"Proteína em forma de sobremesa.",font=F(SANSB,28),fill=INK)
d.text((90,150),"BENTÔLÉ",font=F(SERIFB,86),fill=INK)
d.text((96,258),"picolés proteicos · take-home",font=F(SANS,30),fill=PIST)
dots_arc(d,W-110,250,120,90,270,7,GOLD,5)
para(d,90,330,"Mini picolés proteicos com whey WPH, sem açúcar adicionado e rótulo limpo. Disponíveis nos tamanhos P (55 g) e G (110 g) — o picolé proteico mais desejado, agora na sua vitrine.",F(SANS,23),SOFT,1060,32,3)
d.text((90,470),"Sabores",font=F(SERIFB,40),fill=INK)
d.line([(92,524),(92+64,524)],fill=GOLD,width=3)
# grade de cremes 4 + 3
creams={k:cream(k) for (_,_,k,_) in PIC}
gx=90; cw=(W-180)//4; row1=PIC[:4]; row2=PIC[4:]
for i,(name,spec,k,soon) in enumerate(row1):
    flavor_cell(p,d,gx+cw//2+i*cw,580,creams[k],name,spec,cw,soon)
gx2=(W-3*cw)//2
for i,(name,spec,k,soon) in enumerate(row2):
    flavor_cell(p,d,gx2+cw//2+i*cw,990,creams[k],name,spec,cw,soon)
d.text((90,1560),"Cores e cremes ilustrativos dos sabores · imagem meramente ilustrativa.",font=F(SANS,18),fill=(150,148,134))
pages.append(p)

# ============ POTES ============
p,d=page()
d.text((90,90),"Gelato premium, direto na vitrine.",font=F(SANSB,28),fill=INK)
d.text((90,150),"POTES 140 ml",font=F(SERIFB,82),fill=INK)
d.text((96,256),"gelato proteico selado · pronto pra vender",font=F(SANS,30),fill=PIST)
para(d,90,330,"Gelato proteico em pote selado de 140 ml — sem açúcar adicionado, com 10 a 12 g de proteína. Perfeito para vitrine, take-home e delivery.",F(SANS,23),SOFT,1060,32,3)
img_cover(p,"public/portfolio/potes-140.jpg",90,450,W-180,360,16)
d.text((90,820),"Imagem meramente ilustrativa",font=F(SANS,16),fill=(150,148,134))
d.text((90,900),"Sabores",font=F(SERIFB,40),fill=INK); d.line([(92,954),(92+64,954)],fill=GOLD,width=3)
creamsP={k:cream(k) for (_,_,k) in POT}
cw=(W-180)//3
for i,(name,spec,k) in enumerate(POT):
    flavor_cell(p,d,90+cw//2+i*cw,1010,creamsP[k],name,spec,cw,False)
pages.append(p)

# ============ CONTRACAPA ============
b,d=page()
qr=qrcode.QRCode(box_size=10,border=1); qr.add_data("https://bentogelateria.com/?portfolio=1"); qr.make()
qimg=qr.make_image(fill_color=(31,35,23),back_color=(255,255,255)).convert("RGB")
rrect=Image.new("RGB",(280,280),(196,168,130)); rrect.paste(qimg.resize((230,230)),(25,25))
m=Image.new("L",(280,280),0); ImageDraw.Draw(m).rounded_rectangle([0,0,280,280],22,fill=255)
b.paste(rrect,(90,120),m)
d.text((90,440),"Descubra a nutrição",font=F(SERIFB,46),fill=INK)
d.text((90,496),"de verdade.",font=F(SERIFB,46),fill=PIST)
d.line([(92,576),(92+70,576)],fill=GOLD,width=3)
y=640
for t in ["Fale com a gente","WhatsApp  (27) 99915-9995","bentogelateria@gmail.com","bentogelateria.com"]:
    f=F(SANSB,30) if t=="Fale com a gente" else F(SANS,28)
    d.text((90,y),t,font=f,fill=PIST if t=="Fale com a gente" else INK); y+=(54 if t=="Fale com a gente" else 46)
para(d,90,y+30,"Lojas de suplementos, academias, empórios, cafeterias e mercados premium. Programa de revenda com margens de 30% a 50%.",F(SANS,24),SOFT,1000,34,3)
# logo + assinatura
try:
    lg=Image.open("public/bento-logo.png").convert("RGBA").resize((110,110),Image.LANCZOS); b.paste(lg,(90,H-210),lg)
except Exception: pass
d.text((216,H-188),"BENTÔ",font=F(SERIFB,52),fill=INK)
d.text((220,H-128),"Sabor de sobremesa, ficha de suplemento.",font=F(SANS,24),fill=SOFT)
d.text((90,H-50),"© Bentô Gelatos · ABB Gelateria Ltda · Vitória — ES",font=F(SANS,20),fill=(150,148,134))
pages.append(b)

pages[0].save("public/portfolio-bento.pdf","PDF",save_all=True,append_images=pages[1:],resolution=150.0)
print("PDF gerado:",os.path.getsize("public/portfolio-bento.pdf")//1024,"KB ·",len(pages),"páginas")
