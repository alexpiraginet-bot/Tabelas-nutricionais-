#!/usr/bin/env python3
# Catálogo editorial premium da Bentô (estilo revista). Gera public/portfolio-bento.pdf.
# - "Sabor como creme" gerado por SVG (arte da marca) com a paleta real de cada sabor.
# - Capa com as caixas em pedestal (poster), páginas de produto, contracapa com QR.
import re, os, io, math, unicodedata, cairosvg, qrcode
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
def rrect(d,box,r,fill=None,outline=None,width=1):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)

# ---------- paletas + geração dos cremes ----------
SRC=open("src/data.js").read()
def pal(idkey):
    m=re.search(r'id:"'+re.escape(idkey)+r'"[\s\S]{0,400}?palette:\{base:"(#\w+)",mid:"(#\w+)",deep:"(#\w+)",swirl:"(#\w+)",hl:"(#\w+)"\}',SRC)
    return m.groups() if m else None
PAL_EXTRA={"magnesio":("#F6C66A","#E8A34A","#B5651C","#C9402A","#FFE6B0")}
# Dollops reais (criados pela Bentô), extraídos com fundo transparente em public/portfolio/dollops/
DOLLOP={"bentole-pistache-cb":"pistache","bentole-choco-dubai":"choco","bentole-opereta":"opereta",
        "bentole-snickers":"snickers","bentole-prestigio":"prestigio","bentole-franui":"franui",
        "chocolate-dubai":"choco","pistache":"pistache","doce-de-leite":"doce","magnesio":"magnesio"}
def cream(idkey):
    return f"public/portfolio/dollops/{DOLLOP[idkey]}.png"

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

def flavor_cell(base,d,cx,top,creampath,name,spec,cw,soon=False,dh=210):
    # dollops são teardrops altos: dimensiona pela ALTURA (dh)
    im=Image.open(creampath); cwid=int(im.width*dh/im.height)
    # sombra suave sob o creme
    sh=Image.new("RGBA",(cwid,38),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([cwid*0.18,6,cwid*0.82,28],fill=(60,60,40,55))
    sh=sh.filter(ImageFilter.GaussianBlur(7)); base.paste(sh,(cx-cwid//2,top+dh-20),sh)
    r=im.resize((cwid,dh),Image.LANCZOS); base.paste(r,(cx-cwid//2,top),r)
    yy=top+dh+18
    for ln in wrap(d,name,F(SERIFB,26),cw)[:2]:
        cx_text(d,cx,yy,ln,F(SERIFB,26),INK); yy+=32
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

# ============ UMA PÁGINA POR PRODUTO ============
def product_page(p):
    im,d=page()
    line="PICOLÉ PROTEICO · BENTÔLÉ" if p["cat"]=="picole" else "POTE SELADO · GELATO 140 ML"
    note="Por unidade · tamanho P (~55 g)" if p["cat"]=="picole" else "Por porção de referência (60 g)"
    d.text((90,86),p["tag"],font=F(SANSB,21),fill=INK)
    fb=F(SANSB,19); d.text((W-90-tw(d,line,fb),92),line,font=fb,fill=GOLD)
    d.line([(90,140),(W-90,140)],fill=LINE,width=2)
    dots_arc(d,W-86,250,108,100,250,6,GOLD,4)
    # lockup (nome + sub)
    ny=192
    for ln in wrap(d,p["name"],F(SERIFB,60),540)[:2]:
        d.text((90,ny),ln,font=F(SERIFB,60),fill=INK); ny+=70
    d.text((92,ny+2),p["sub"],font=F(SANS,24),fill=PIST); ny+=64
    if p["soon"]:
        d.text((90,ny),"Lançamento em breve",font=F(SERIFB,36),fill=GOLD); ny+=70
        para(d,90,ny,p["teaser"],F(SANS,23),SOFT,540,33,7)
    else:
        sp=dict(p["specs"])
        d.text((90,ny),f'{sp["Proteína"]} de proteína',font=F(SERIFB,38),fill=INK)
        d.text((92,ny+54),f'{sp["Valor energético"]} · açúcar adicionado {sp["Açúcar adicionado"]} · {sp["Fibra alimentar"]} de fibra',font=F(SANS,21),fill=INK); ny+=104
        szk="Tamanhos" if "Tamanhos" in sp else "Formato"
        d.text((90,ny),f'{szk}: {sp[szk]}',font=F(SANS,21),fill=SOFT); ny+=34
        d.text((90,ny),sp["Restrições"],font=F(SANS,21),fill=SOFT); ny+=30
        d.text((90,ny),note,font=F(SANS,16),fill=(150,148,134)); ny+=46
        ny=para(d,90,ny,p["desc"],F(SANS,22),SOFT,540,32,4)+16
        d.text((90,ny),"PRINCIPAIS INGREDIENTES",font=F(SANSB,16),fill=PIST); ny+=28
        para(d,90,ny,ING.get(p["name"],""),F(SANS,20),INK,540,28,3)
    # visual principal (direita): hero shot
    rx0,ry0,rx1,ry1=636,236,1162,1296
    hero=p.get("hero")
    if hero and os.path.exists(hero):
        v=Image.open(hero).convert("RGB")
        s=min((rx1-rx0)/v.width,(ry1-ry0)/v.height); nw,nh=int(v.width*s),int(v.height*s)
        v=v.resize((nw,nh),Image.LANCZOS); im.paste(v,(rx0+(rx1-rx0-nw)//2,ry0+(ry1-ry0-nh)//2))
        cap_y=ry0+(ry1-ry0+nh)//2+16
    else:
        cap_y=ry1+16
    cx_text(d,(rx0+rx1)//2,cap_y,"Imagem meramente ilustrativa",F(SANS,15),(150,148,134))
    # "o creme do sabor" (dollop) — preenche o canto inferior esquerdo
    lcx=350; dd=Image.open(p["dollop"]).convert("RGBA"); dh1=372; w1=int(dd.width*dh1/dd.height); dtop=946
    sh=Image.new("RGBA",(w1,46),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([w1*0.2,10,w1*0.8,36],fill=(60,60,40,52))
    sh=sh.filter(ImageFilter.GaussianBlur(8)); im.paste(sh,(lcx-w1//2,dtop+dh1-22),sh)
    im.paste(dd.resize((w1,dh1),Image.LANCZOS),(lcx-w1//2,dtop),dd.resize((w1,dh1),Image.LANCZOS))
    cx_text(d,lcx,dtop+dh1+20,"O creme do sabor",F(SERIFB,24),INK)
    cx_text(d,lcx,dtop+dh1+54,"imagem meramente ilustrativa",F(SANS,14),(150,148,134))
    d.text((90,H-52),"bentogelateria.com",font=F(SANS,20),fill=GOLD)
    d.text((W-90-tw(d,p["pg"],F(SANS,20)),H-52),p["pg"],font=F(SANS,20),fill=SOFT)
    return im

SZ=("Tamanhos","P 55 g · G 110 g")
PICOLES=[
 dict(name="Pistache & Choco Branco",sub="Recheio, cobertura e pistaches inteiros",
   desc="Pasta de pistache selecionada com recheio, cobertura de chocolate branco e pistaches inteiros. O campeão da linha: 10 g de proteína com apenas 61 kcal por unidade.",
   dollop="public/portfolio/dollops/pistache.png",photo="public/sabores/bentole-pistache-cb.jpg",
   specs=[("Proteína","10 g"),("Valor energético","61 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","3,7 g"),SZ,("Restrições","Sem glúten · contém lactose")]),
 dict(name="Chocolate Dubai",sub="Cacau, pistache, kadaif e stracciatella",
   desc="A tendência do Dubai em mini picolé proteico: cacau escuro, creme de pistache, stracciatella e kadaif crocante.",
   dollop="public/portfolio/dollops/choco.png",photo="public/sabores/bentole-choco-dubai.jpg",
   specs=[("Proteína","10 g"),("Valor energético","108 kcal"),("Açúcar adicionado","0,1 g"),("Fibra alimentar","1,5 g"),SZ,("Restrições","Contém glúten e lactose")]),
 dict(name="Opereta",sub="Chocolate branco Latissimo e castanhas",
   desc="Chocolate branco Latissimo com castanhas selecionadas. Elegante, crocante e sofisticado — 9,9 g de proteína por unidade.",
   dollop="public/portfolio/dollops/opereta.png",photo="public/sabores/bentole-opereta.jpg",
   specs=[("Proteína","9,9 g"),("Valor energético","86 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","0,2 g"),SZ,("Restrições","Sem glúten · contém lactose")]),
 dict(name="Snickers",sub="Amendoim, doce de leite e chocolate 70%",
   desc="Inspirado no clássico, em versão proteica: amendoim real, doce de leite zero açúcar e chocolate 70%.",
   dollop="public/portfolio/dollops/snickers.png",photo="public/sabores/bentole-snickers.jpg",
   specs=[("Proteína","9,6 g"),("Valor energético","95 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","0,5 g"),SZ,("Restrições","Sem glúten · sem lactose")]),
 dict(name="Prestígio",sub="Coco cremoso e cobertura de chocolate",
   desc="O clássico Prestígio reinventado em mini picolé proteico: coco cremoso com cobertura de chocolate, sem açúcar adicionado.",
   dollop="public/portfolio/dollops/prestigio.png",photo="public/sabores/bentole-prestigio.jpg",
   specs=[("Proteína","8 g"),("Valor energético","91 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","1 g"),SZ,("Restrições","Sem glúten · contém lactose")]),
 dict(name="Franuí",sub="Framboesa, chocolate branco e chocolate 70%",
   desc="O mais leve e frutado da linha: framboesa real, colágeno e cobertura dupla de chocolate — apenas 42 kcal por unidade.",
   dollop="public/portfolio/dollops/franui.png",photo="public/sabores/bentole-franui.jpg",
   specs=[("Proteína","1,2 g"),("Valor energético","42 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","7,7 g"),SZ,("Restrições","Sem glúten · sem lactose")]),
 dict(name="Magnésio + Inositol Relief 3.0",sub="Tangerina com Maracujá · funcional",
   desc="Picolé funcional da linha Relief 3.0, em parceria com a True.",soon=True,
   teaser="Em breve na linha Bentôlé: um picolé funcional de Tangerina com Maracujá, com magnésio e inositol. Disponível no tamanho P (55 g). Informações nutricionais completas no lançamento.",
   dollop="public/portfolio/dollops/magnesio.png",photo="public/sabores/bentole-magnesio.jpg"),
]
POTES=[
 dict(name="Chocolate Dubai",sub="Creme crocante e granela crocante",
   desc="O Dubai em pote selado de 140 ml: chocolate com creme crocante e granela. Pronto para vitrine, take-home e delivery.",
   dollop="public/portfolio/dollops/choco.png",photo="public/sabores/chocolate-dubai.jpg",
   specs=[("Proteína","12 g"),("Valor energético","162 kcal"),("Açúcar adicionado","0,1 g"),("Fibra alimentar","2,5 g"),("Formato","Pote selado · 140 ml"),("Restrições","Contém glúten e lactose")]),
 dict(name="Pistache",sub="Pistache mesclado e granela",
   desc="Pasta de pistache italiana selecionada, sabor intenso e cor natural, em pote selado de 140 ml.",
   dollop="public/portfolio/dollops/pistache.png",photo="public/sabores/pistache.jpg",
   specs=[("Proteína","10 g"),("Valor energético","130 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","0 g"),("Formato","Pote selado · 140 ml"),("Restrições","Contém glúten · sem lactose")]),
 dict(name="Doce de Leite",sub="Doce de leite mesclado e granela",
   desc="O sabor afetivo brasileiro, zero açúcar adicionado, com whey WPH — em pote selado de 140 ml.",
   dollop="public/portfolio/dollops/doce.png",photo="public/sabores/doce-de-leite.jpg",
   specs=[("Proteína","11 g"),("Valor energético","138 kcal"),("Açúcar adicionado","0 g"),("Fibra alimentar","0,2 g"),("Formato","Pote selado · 140 ml"),("Restrições","Sem glúten · sem lactose")]),
]
ING={
 "Pistache & Choco Branco":"Pasta de pistache italiana selecionada, whey WPH, cobertura de chocolate branco zero, pistaches inteiros e leite.",
 "Chocolate Dubai":"Whey WPH, cacau, creme de pistache, stracciatella zero, kadaif crocante e leite.",
 "Opereta":"Whey WPH, chocolate branco, castanhas selecionadas e leite.",
 "Snickers":"Whey WPH, pasta de amendoim, doce de leite zero açúcar, chocolate 70% e leite.",
 "Prestígio":"Whey WPH, leite de coco, coco ralado e cobertura de chocolate ao leite zero.",
 "Franuí":"Framboesa real, colágeno hidrolisado e cobertura dupla de chocolate (branco e 70% zero).",
 "Pistache":"Pasta de pistache italiana selecionada, whey WPH e leite.",
 "Doce de Leite":"Doce de leite zero açúcar, whey WPH e leite.",
}
def slug(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+","-",s).strip("-")
allp=[{**x,"cat":"picole"} for x in PICOLES]+[{**x,"cat":"pote"} for x in POTES]
total=len(allp)+2
GELID={"Chocolate Dubai":"chocolate-dubai","Pistache":"pistache","Doce de Leite":"doce-de-leite"}
for i,pp in enumerate(allp):
    pp["soon"]=pp.get("soon",False)
    pp["box"]=("pote-" if pp["cat"]=="pote" else "")+slug(pp["name"])
    if pp["cat"]=="picole":
        pp["hero"]=f"public/portfolio/heros/{slug(pp['name'])}.jpg"
    else:
        pp["hero"]=f"public/sabores/{GELID[pp['name']]}.jpg"
    pp["tag"]=("Picolés Bentôlé · " if pp["cat"]=="picole" else "Potes 140 ml · ")+f"{i+1:02d}/{len(allp)}"
    pp["pg"]=f"{i+2:02d} / {total}"
    pages.append(product_page(pp))

# ============ CONTRACAPA ============
b,d=page()
qr=qrcode.QRCode(box_size=10,border=1); qr.add_data("https://bentogelateria.com/?portfolio=1"); qr.make()
qimg=qr.make_image(fill_color=(31,35,23),back_color=(255,255,255)).convert("RGB")
qbox=Image.new("RGB",(280,280),(196,168,130)); qbox.paste(qimg.resize((230,230)),(25,25))
m=Image.new("L",(280,280),0); ImageDraw.Draw(m).rounded_rectangle([0,0,280,280],22,fill=255)
b.paste(qbox,(90,120),m)
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
