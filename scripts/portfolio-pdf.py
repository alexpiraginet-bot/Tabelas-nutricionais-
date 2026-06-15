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
    note="Valores por unidade · tamanho P (~55 g)" if p["cat"]=="picole" else "Valores por porção de referência (60 g)"
    d.text((90,86),p["tag"],font=F(SANSB,21),fill=INK)
    fb=F(SANSB,19); d.text((W-90-tw(d,line,fb),92),line,font=fb,fill=GOLD)
    d.line([(90,140),(W-90,140)],fill=LINE,width=2)
    dots_arc(d,W-86,250,110,100,250,6,GOLD,4)
    ny=180
    for ln in wrap(d,p["name"],F(SERIFB,64),580)[:2]:
        d.text((90,ny),ln,font=F(SERIFB,64),fill=INK); ny+=74
    d.text((92,ny+2),p["sub"],font=F(SANS,25),fill=PIST); ny+=58
    ny=para(d,90,ny+18,p["desc"],F(SANS,23),SOFT,560,33,5)
    # ficha (card)
    cx0,cw0,cy0=90,560,656
    rows=len(p["specs"]) if not p["soon"] else 0
    ch0=(136+66+7*31+30) if p["soon"] else (136+rows*46+24+30+92+28)
    rrect(d,[cx0,cy0,cx0+cw0,cy0+ch0],16,fill=SURF,outline=LINE,width=2)
    d.text((cx0+30,cy0+28),"Lançamento" if p["soon"] else "Ficha do produto",font=F(SANSB,26),fill=PIST)
    d.line([(cx0+30,cy0+74),(cx0+30+60,cy0+74)],fill=GOLD,width=3)
    if not p["soon"]:
        d.text((cx0+30,cy0+90),note,font=F(SANS,18),fill=(150,148,134))
    ry=cy0+136
    if p["soon"]:
        d.text((cx0+30,ry),"Lançamento em breve",font=F(SERIFB,34),fill=INK); ry+=66
        para(d,cx0+30,ry,p["teaser"],F(SANS,22),SOFT,cw0-60,31,7)
    else:
        for lab,val in p["specs"]:
            d.text((cx0+30,ry),lab,font=F(SANS,22),fill=SOFT)
            vf=F(SANSB,24); d.text((cx0+cw0-30-tw(d,val,vf),ry-2),val,font=vf,fill=INK)
            ry+=46; d.line([(cx0+30,ry-10),(cx0+cw0-30,ry-10)],fill=(233,227,212),width=1)
        ry+=16
        d.text((cx0+30,ry),"PRINCIPAIS INGREDIENTES",font=F(SANSB,16),fill=PIST); ry+=28
        para(d,cx0+30,ry,ING.get(p["name"],""),F(SANS,20),INK,cw0-60,28,3)
    # creme do sabor (dollop)
    rcx=700+225; dh=540; im2=Image.open(p["dollop"]); w2=int(im2.width*dh/im2.height); dtop=206
    sh=Image.new("RGBA",(w2,46),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([w2*0.2,10,w2*0.8,36],fill=(60,60,40,55))
    sh=sh.filter(ImageFilter.GaussianBlur(8)); im.paste(sh,(rcx-w2//2,dtop+dh-24),sh)
    rr=im2.resize((w2,dh),Image.LANCZOS); im.paste(rr,(rcx-w2//2,dtop),rr)
    cx_text(d,rcx,dtop+dh+18,"O creme do sabor",F(SERIFB,24),INK)
    # caixinha do produto (card)
    bx0,by0,bx1,by1=700,818,1150,1600
    rrect(d,[bx0,by0,bx1,by1],16,fill=(255,255,255),outline=LINE,width=2)
    boxp=f"public/portfolio/boxes/{p['box']}.png"
    if os.path.exists(boxp):
        im3=Image.open(boxp).convert("RGBA"); pad=34
        s=min((bx1-bx0-2*pad)/im3.width,(by1-by0-2*pad)/im3.height); nw,nh=int(im3.width*s),int(im3.height*s)
        im3=im3.resize((nw,nh),Image.LANCZOS); im.paste(im3,(bx0+(bx1-bx0-nw)//2,by0+(by1-by0-nh)//2),im3)
    else:
        mx,my=(bx0+bx1)//2,(by0+by1)//2
        cx_text(d,mx,my-22,"Imagem da caixa",F(SERIFB,28),SOFT); cx_text(d,mx,my+24,"(P e G) em breve",F(SANS,22),(150,148,134))
    cx_text(d,(bx0+bx1)//2,by1+12,"Imagem meramente ilustrativa",F(SANS,15),fill=(150,148,134))
    # frase de marca (preenche canto inferior esquerdo)
    d.text((90,1510),"“Sabor de sobremesa,",font=F(SERIFB,30),fill=INK)
    d.text((90,1552),"ficha de suplemento.”",font=F(SERIFB,30),fill=PIST)
    d.text((90,H-52),"bentogelateria.com",font=F(SANS,20),fill=GOLD)
    pg=p["pg"]; d.text((W-90-tw(d,pg,F(SANS,20)),H-52),pg,font=F(SANS,20),fill=SOFT)
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
for i,pp in enumerate(allp):
    pp["soon"]=pp.get("soon",False)
    pp["box"]=("pote-" if pp["cat"]=="pote" else "")+slug(pp["name"])
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
