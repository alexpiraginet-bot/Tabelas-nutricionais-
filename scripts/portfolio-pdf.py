#!/usr/bin/env python3
# Gera public/portfolio-bento.pdf — portfólio de produtos para parceiros.
# Capa + pôster de picolés + lineup + potes 140ml + página de contato.
from PIL import Image, ImageDraw, ImageFont
import os

BG=(241,236,221); INK=(31,35,23); SOFT=(90,94,78); PIST=(92,107,58); GOLD=(196,168,130)
W,H=1240,1754  # A4 @150dpi
SERIF="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIFB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANSB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def F(p,s): return ImageFont.truetype(p,s)

def page():
    im=Image.new("RGB",(W,H),BG); return im, ImageDraw.Draw(im)
def center(d,y,txt,font,fill,ls=0):
    if ls:
        # letter-spacing manual
        widths=[d.textlength(c,font=font)+ls for c in txt]
        total=sum(widths)-ls
        x=(W-total)/2
        for c in txt:
            d.text((x,y),c,font=font,fill=fill); x+=d.textlength(c,font=font)+ls
    else:
        w=d.textlength(txt,font=font); d.text(((W-w)/2,y),txt,font=font,fill=fill)

def img_page(path,caption=None):
    im,d=page()
    pic=Image.open(path).convert("RGB")
    mw,mh=W-160, H-300
    r=min(mw/pic.width, mh/pic.height); nw,nh=int(pic.width*r),int(pic.height*r)
    pic=pic.resize((nw,nh),Image.LANCZOS)
    x=(W-nw)//2; y=(H-nh)//2-30
    # moldura suave
    d.rectangle([x-2,y-2,x+nw+2,y+nh+2],outline=GOLD,width=2)
    im.paste(pic,(x,y))
    center(d, y+nh+34, caption or "", F(SANS,26), SOFT)
    center(d, H-70, "bentogelateria.com", F(SANS,22), GOLD)
    return im

# ---- CAPA ----
cover,d=page()
try:
    logo=Image.open("public/bento-logo.png").convert("RGBA").resize((230,230),Image.LANCZOS)
    cover.paste(logo,((W-230)//2,360),logo)
except Exception as e:
    print("logo:",e)
center(d, 640, "B E N T Ô   G E L A T O S", F(SANS,26), PIST)
center(d, 700, "Portfólio de Produtos", F(SERIFB,82), INK)
center(d, 820, "Linha proteica · sem açúcar adicionado · rótulo limpo", F(SANS,30), SOFT)
d.line([(W/2-120,900),(W/2+120,900)],fill=GOLD,width=3)
center(d, 960, "Apresentação para parceiros", F(SANS,28), INK)
center(d, H-150, "Vitória — ES  ·  Praia do Canto  ·  Jardim Camburi", F(SANS,24), SOFT)
center(d, H-100, "bentogelateria.com  ·  (27) 99915-9995", F(SANS,24), GOLD)

# ---- páginas de imagem ----
p_poster=img_page("public/portfolio/picoles-poster.jpg","Linha Bentôlé — picolés proteicos · tamanhos P (55 g) e G (110 g)")
p_lineup=img_page("public/portfolio/picoles-lineup.jpg","Sabores Bentôlé · sem açúcar adicionado, ricos em proteína")
p_potes =img_page("public/portfolio/potes-140.jpg","Potes selados 140 ml · Chocolate Dubai, Pistache e Doce de Leite")

# ---- contato / por que parceria ----
last,d=page()
center(d,150,"Por que ter a Bentô na sua loja",F(SERIFB,56),INK)
d.line([(W/2-120,250),(W/2+120,250)],fill=GOLD,width=3)
bullets=[
 ("Premium","Estética sofisticada e percepção de valor acima do congelado comum."),
 ("Proteico","Whey WPH — comunicação direta com o público fitness e wellness."),
 ("Sem açúcar adicionado","Rótulo limpo, opções low-carb e para controle glicêmico."),
 ("Impulso & recorrência","Formato prático para venda no checkout e recompra."),
 ("Margem atrativa","Picolés e potes 140 ml com boa margem para o parceiro."),
]
y=320
for t,desc in bullets:
    d.ellipse([140,y+8,160,y+28],fill=PIST)
    d.text((185,y),t,font=F(SANSB,34),fill=INK)
    d.text((185,y+46),desc,font=F(SANS,26),fill=SOFT)
    y+=130
# bloco contato
d.rectangle([120,y+30,W-120,y+250],fill=(235,227,206))
d.text((160,y+60),"Fale com a gente",font=F(SANSB,34),fill=PIST)
d.text((160,y+115),"WhatsApp  (27) 99915-9995",font=F(SANS,30),fill=INK)
d.text((160,y+160),"bentogelateria@gmail.com",font=F(SANS,30),fill=INK)
d.text((160,y+205),"bentogelateria.com",font=F(SANS,30),fill=INK)
center(d,H-70,"Bentô Gelatos · ABB Gelateria Ltda · Vitória — ES",F(SANS,22),SOFT)

pages=[p_poster,p_lineup,p_potes,last]
cover.save("public/portfolio-bento.pdf","PDF",save_all=True,append_images=pages,resolution=150.0)
print("PDF gerado:", os.path.getsize("public/portfolio-bento.pdf")//1024,"KB ·",1+len(pages),"páginas")
