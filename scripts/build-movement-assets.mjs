import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const MASTER_DIR = path.join(ROOT_DIR, "assets/movimento-v2/masters");
const FINAL_OUTPUT_DIR = path.join(ROOT_DIR, "public/movimento/v2");
const STAGING_DIR = path.join(ROOT_DIR, "public/movimento/.v2-staging");
const BACKUP_DIR = path.join(ROOT_DIR, "public/movimento/.v2-backup");
const OUTPUT_DIR = STAGING_DIR;
const EXACT_ASSETS = {
  shirt: path.join(ROOT_DIR, "public/movimento/camiseta-referencia.jpg"),
  product: path.join(ROOT_DIR, "public/movimento/picoles-lineup-real.jpg"),
};
const DISCLOSURE = "Visualização conceitual gerada por IA";
const COMPOSED_DISCLOSURES = {
  "editorial-board:product": "produto e embalagem do acervo real Bentô compostos sem redesenho",
  "editorial-board:shirt": "referência oficial de camiseta Bentô composta sem redesenho",
  shirt: "referência oficial de camiseta Bentô composta sem redesenho",
  product: "produto e embalagem do acervo real Bentô compostos sem redesenho",
  wordmark: "wordmark oficial Bentô composto sem redesenho",
  cart: "carrinho real Bentô preservado sem substituição da marca existente",
};
const PIPELINE_VERSION = "movement-v2-7";
const MANAGED_OUTPUT_PATTERN = /^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-(?:mobile|desktop)-\d+\.(?:avif|webp|jpg)$|^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-lqip\.jpg$|^manifest\.json$/;
const GENERATED_OUTPUT_PATTERN = /^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-(?:mobile|desktop)-\d+(?: 2)?\.(?:avif|webp|jpg)$|^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-lqip(?: 2)?\.jpg$|^manifest(?: 2)?\.json$/;

const ROUTES = {
  influencer: ["INF-HERO", ...Array.from({ length: 14 }, (_, index) => `INF-${String(index + 1).padStart(2, "0")}`)],
  partner: ["PAR-HERO", ...Array.from({ length: 16 }, (_, index) => `PAR-${String(index + 1).padStart(2, "0")}`)],
};

const ALT_TEXT = {
  "INF-HERO": "Grupo de convidadas chegando em roupa de treino ao lounge contemporâneo junto ao canal urbano de Vitória",
  "INF-01": "Deck contemporâneo do lounge junto ao canal e à marina urbana preparado para a manhã Bentô",
  "INF-02": "Convidadas em roupa de treino chegando ao lounge em transporte executivo premium com motorista",
  "INF-03": "Grupo de mulheres atléticas vivendo um aulão funcional natural em estações bem organizadas",
  "INF-04": "Crianças acompanhadas por adultos decorando picolés em oficina organizada dentro do cerimonial",
  "INF-05": "Convidada em roupa de treino recebendo cuidado em uma estação elegante de recovery",
  "INF-06": "Composição editorial do kit e da camiseta de treino oficial reservados à convidada",
  "INF-07": "Convidadas celebrando de forma espontânea o primeiro aniversário Bentô depois do treino",
  "INF-08": "Dois profissionais preparando cafés especiais em V60 e máquina de espresso diante das convidadas",
  "INF-09": "Convidadas reunidas diante de uma mesa elegante de café da manhã com frutas pães e louças claras",
  "INF-10": "Carrinho de gelato Bentô em atendimento durante a celebração com convidadas ao redor",
  "INF-11": "Kits de suplementação organizados sobre uma mesa de marca em uma apresentação elegante de bem-estar",
  "INF-12": "Mulheres recebendo atendimento profissional de skincare e maquiagem em estações claras e organizadas",
  "INF-13": "Convidadas de avental criando os próprios picolés com profissionais Bentô de jaleco branco",
  "INF-14": "Crianças acompanhadas brincando com brinquedos minimalistas de madeira mesas baixas blocos e casinha",
  "PAR-HERO": "Estrutura branca e dourada pronta para receber marcas no lounge junto ao canal urbano",
  "PAR-01": "Recepção de chegada com anfitriã entregando pulseira a convidadas junto a uma instalação arquitetônica dourada",
  "PAR-02": "Transporte executivo premium com motorista recebendo convidadas na chegada ao lounge",
  "PAR-03": "Café da manhã editorial com áreas limpas para presença funcional de uma marca participante",
  "PAR-04": "Aulão funcional natural com materiais que podem receber aplicações de parceiros em uso real",
  "PAR-05": "Estação premium de recovery com equipamentos e superfícies disponíveis para integração de marca",
  "PAR-06": "Oficina infantil de decoração de picolés com espaço organizado para uma participação de marca",
  "PAR-07": "Kit editorial e camiseta oficial com área de composição coletiva abaixo da frase nas costas",
  "PAR-08": "Produtos reais Bentô compostos em um cenário editorial para estudo de cocriação responsável",
  "PAR-09": "Backdrop branco e dourado preparado como ponto de fotografia para o encontro Bentô",
  "PAR-10": "Mesa de curadoria com amostras de materiais e espaços limpos para propostas de participação",
  "PAR-11": "Dois baristas preparando V60 e espresso em uma mesa de cafés especiais com áreas de presença de marca",
  "PAR-12": "Carrinho oficial de gelato Bentô em atendimento com painel reservado para uma aplicação aprovada de parceiro",
  "PAR-13": "Kits de suplementação organizados sobre mesa de marca com embalagens neutras e materiais de orientação",
  "PAR-14": "Equipe profissional realizando skincare e maquiagem em mulheres diante de espelhos iluminados",
  "PAR-15": "Adultas de avental fabricando picolés com profissionais de jaleco branco em uma bancada de alimentos",
  "PAR-16": "Espaço infantil minimalista com brinquedos de madeira mesas baixas blocos e crianças acompanhadas",
};

const SCENE_IDS = [...ROUTES.influencer, ...ROUTES.partner];
const EXPECTED_OUTPUT_COUNT = 1 + SCENE_IDS.reduce((total, id) => total + (isHero(id) ? 13 : 16), 0);
const COMPOSITIONS = {
  "INF-06": { kind: "shirt", mode: "editorial-board" },
  "PAR-07": { kind: "shirt", mode: "editorial-board" },
  "PAR-08": { kind: "product", mode: "editorial-board" },
};
const OFFICIAL_WORDMARK_SOURCE_IDS = new Set(["PAR-09"]);
const CART_SOURCE_IDS = new Set(["INF-10", "PAR-12"]);
const FORMATS = {
  avif: { extension: "avif", encode: (image) => image.avif({ quality: 45, effort: 4 }) },
  webp: { extension: "webp", encode: (image) => image.webp({ quality: 72, effort: 6, smartSubsample: true }) },
  jpg: { extension: "jpg", encode: (image) => image.jpeg({ quality: 76, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" }) },
};

function isHero(id) {
  return id.endsWith("HERO");
}

function targetWidths(id, direction) {
  if (direction === "mobile") return isHero(id) ? [480, 768] : [480, 752];
  return isHero(id) ? [1080, 1440] : [768, 1080, 1440];
}

function targetHeight(id, direction, width) {
  if (direction === "mobile") return Math.round(width * (isHero(id) ? 16 / 9 : 5 / 4));
  return Math.round(width * (isHero(id) ? 9 / 16 : 10 / 16));
}

function cropPosition(id, direction) {
  if (direction !== "mobile") return "centre";
  if (id === "INF-05") return "left";
  return "centre";
}

async function sourcePath(id, direction) {
  const stem = isHero(id) ? `${id}-${direction}` : id;
  const candidates = [];

  for (const extension of ["jpg", "jpeg", "png"]) {
    const candidate = path.join(MASTER_DIR, `${stem}.${extension}`);
    try {
      const candidateStat = await stat(candidate);
      if (candidateStat.isFile()) candidates.push(candidate);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  if (candidates.length !== 1) {
    throw new Error(`${stem} needs exactly one JPG or PNG source master; found ${candidates.length}`);
  }

  return candidates[0];
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function publicPath(filename) {
  return `/movimento/v2/${filename}`;
}

async function inspectMaster(id, direction) {
  const filePath = await sourcePath(id, direction);
  const [buffer, metadata] = await Promise.all([readFile(filePath), sharp(filePath).metadata()]);
  const largestWidth = targetWidths(id, direction).at(-1);
  const largestHeight = targetHeight(id, direction, largestWidth);

  if (!["jpeg", "png"].includes(metadata.format)) throw new Error(`${id}-${direction} must be a JPG or PNG master`);
  if ((metadata.width || 0) < largestWidth || (metadata.height || 0) < largestHeight) {
    throw new Error(`${id}-${direction} is ${metadata.width}x${metadata.height}; at least ${largestWidth}x${largestHeight} is required to avoid upscaling`);
  }

  return { buffer, height: metadata.height, sha256: sha256(buffer), width: metadata.width };
}

function disclosureFor(id) {
  const details = [];
  if (COMPOSITIONS[id]) {
    const composition = COMPOSITIONS[id];
    details.push(COMPOSED_DISCLOSURES[`${composition.mode}:${composition.kind}`] || COMPOSED_DISCLOSURES[composition.mode] || COMPOSED_DISCLOSURES[composition.kind]);
  }
  if (OFFICIAL_WORDMARK_SOURCE_IDS.has(id)) details.push(COMPOSED_DISCLOSURES.wordmark);
  if (CART_SOURCE_IDS.has(id)) details.push(COMPOSED_DISCLOSURES.cart);
  return details.length ? `${DISCLOSURE} · ${details.join(" · ")}.` : DISCLOSURE;
}

async function composeExactAsset(id, direction, master) {
  const composition = COMPOSITIONS[id];
  if (!composition) return master;
  if (composition.mode === "editorial-board") return createEditorialBoard(id, master, EXACT_ASSETS[composition.kind], direction);

  const placement = composition[direction];
  const exactBuffer = await readFile(EXACT_ASSETS[composition.kind]);
  const insetWidth = Math.round(master.width * placement.width);
  const maxInsetHeight = Math.round(master.height * placement.maxHeight);
  const inset = await sharp(exactBuffer, { failOn: "error" })
    .rotate()
    .resize({ width: insetWidth, height: maxInsetHeight, fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .jpeg({ quality: 92, progressive: true, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const insetMetadata = await sharp(inset).metadata();
  const left = Math.min(Math.round(master.width * placement.left), master.width - insetMetadata.width);
  const top = Math.min(Math.round(master.height * placement.top), master.height - insetMetadata.height);
  const composedBuffer = await sharp(master.buffer, { failOn: "error", limitInputPixels: 80_000_000 })
    .rotate()
    .composite([{ input: inset, left: Math.max(0, left), top: Math.max(0, top) }])
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();

  return {
    ...master,
    buffer: composedBuffer,
    sha256: sha256([master.sha256, sha256(exactBuffer), JSON.stringify(composition)].join("\n")),
  };
}

export async function createEditorialBoard(id, master, exactAssetPath, direction) {
  const exactBuffer = await readFile(exactAssetPath);
  const canvas = direction === "mobile"
    ? { width: 752, height: 940 }
    : { width: 1440, height: 900 };
  const isPartnerShirt = id === "PAR-07";
  let composedBuffer;

  if (isPartnerShirt) {
    const margin = direction === "mobile" ? 36 : 54;
    const card = { width: canvas.width - margin * 2, height: canvas.height - margin * 2 };
    const inset = await sharp(exactBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: card.width - 28, height: card.height - 28, fit: "contain", background: "#fbf7ef", withoutEnlargement: true })
      .flatten({ background: "#fbf7ef" })
      .toColourspace("srgb")
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
    const insetMetadata = await sharp(inset).metadata();
    const cardSvg = Buffer.from(`<svg width="${card.width}" height="${card.height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${card.width - 2}" height="${card.height - 2}" rx="2" fill="#fbf7ef" stroke="#b18a3b" stroke-width="2"/><path d="M 22 ${card.height - 17} H ${card.width - 22}" stroke="#d8c18b" stroke-width="1"/></svg>`);
    composedBuffer = await sharp({ create: { ...canvas, channels: 3, background: "#e8deca" } })
      .composite([
        { input: cardSvg, left: margin, top: margin },
        {
          input: inset,
          left: Math.round((canvas.width - insetMetadata.width) / 2),
          top: Math.round((canvas.height - insetMetadata.height) / 2),
        },
      ])
      .toColourspace("srgb")
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
  } else {
    composedBuffer = await sharp(exactBuffer, { failOn: "error" })
      .rotate()
      .resize({ ...canvas, fit: "contain", background: "#f4eee4", withoutEnlargement: true })
      .flatten({ background: "#f4eee4" })
      .toColourspace("srgb")
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
  }

  return {
    ...master,
    ...canvas,
    buffer: composedBuffer,
    sha256: sha256([master.sha256, sha256(exactBuffer), "editorial-board", id, direction].join("\n")),
  };
}

async function composeMaster(id, direction, master) {
  return composeExactAsset(id, direction, master);
}

function renditionName(id, direction, width, extension) {
  return `${id}-${direction}-${width}.${extension}`;
}

async function encodeRendition({ id, direction, master, width, format }) {
  const height = targetHeight(id, direction, width);
  const filename = renditionName(id, direction, width, FORMATS[format].extension);
  const outputPath = path.join(OUTPUT_DIR, filename);
  const base = sharp(master.buffer, { failOn: "error", limitInputPixels: 80_000_000 })
    .rotate()
    .resize(width, height, { fit: "cover", position: cropPosition(id, direction), withoutEnlargement: true })
    .toColourspace("srgb");
  const output = await FORMATS[format].encode(base).toBuffer();

  await writeFile(outputPath, output);
  return {
    src: publicPath(filename),
    width,
    height,
    bytes: output.length,
    sha256: sha256(output),
  };
}

async function encodeLqip(id, master) {
  const width = 24;
  const height = targetHeight(id, "mobile", width);
  const filename = `${id}-lqip.jpg`;
  const output = await sharp(master.buffer, { failOn: "error", limitInputPixels: 80_000_000 })
    .rotate()
    .resize(width, height, { fit: "cover", position: cropPosition(id, "mobile"), withoutEnlargement: true })
    .blur(0.6)
    .toColourspace("srgb")
    .jpeg({ quality: 24, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  if (output.length >= 1_536) throw new Error(`${id} LQIP is ${output.length} bytes; limit is 1535`);
  await writeFile(path.join(OUTPUT_DIR, filename), output);
  return { src: publicPath(filename), width, height, bytes: output.length, sha256: sha256(output) };
}

async function buildVariant(id, direction, master) {
  const sources = {};
  for (const format of Object.keys(FORMATS)) {
    sources[format] = [];
    for (const width of targetWidths(id, direction)) {
      sources[format].push(await encodeRendition({ id, direction, master, width, format }));
    }
  }
  return {
    aspectRatio: isHero(id) ? (direction === "mobile" ? 9 / 16 : 16 / 9) : (direction === "mobile" ? 4 / 5 : 16 / 10),
    sources,
  };
}

async function buildAsset(id) {
  const [rawMobileMaster, rawDesktopMaster] = await Promise.all([
    inspectMaster(id, "mobile"),
    inspectMaster(id, "desktop"),
  ]);
  const [mobileMaster, desktopMaster] = await Promise.all([
    composeMaster(id, "mobile", rawMobileMaster),
    composeMaster(id, "desktop", rawDesktopMaster),
  ]);
  const [mobile, desktop, lqip] = await Promise.all([
    buildVariant(id, "mobile", mobileMaster),
    buildVariant(id, "desktop", desktopMaster),
    encodeLqip(id, mobileMaster),
  ]);
  const sourceSha256 = sha256([
    PIPELINE_VERSION,
    mobileMaster.sha256,
    desktopMaster.sha256,
  ].join("\n"));

  return {
    id,
    generated: true,
    sourceSha256,
    alt: ALT_TEXT[id],
    disclosure: disclosureFor(id),
    master: {
      mobile: { width: mobileMaster.width, height: mobileMaster.height, sha256: mobileMaster.sha256 },
      desktop: { width: desktopMaster.width, height: desktopMaster.height, sha256: desktopMaster.sha256 },
    },
    lqip,
    mobile,
    desktop,
  };
}

async function assertOutput(manifest) {
  const sourceHashes = Object.values(manifest.assets).map(({ sourceSha256 }) => sourceSha256);
  if (new Set(sourceHashes).size !== SCENE_IDS.length) throw new Error("Every scene family must have a unique source hash");

  for (const asset of Object.values(manifest.assets)) {
    for (const direction of ["mobile", "desktop"]) {
      for (const renditions of Object.values(asset[direction].sources)) {
        for (const rendition of renditions) {
          const outputStat = await stat(path.join(OUTPUT_DIR, path.basename(rendition.src)));
          if (outputStat.size !== rendition.bytes) throw new Error(`${rendition.src} changed after hashing`);
        }
      }
    }
  }
}

async function readDirectoryOrEmpty(directory) {
  try {
    return await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function clearGeneratedDirectory(directory) {
  await mkdir(directory, { recursive: true });
  for (const filename of await readDirectoryOrEmpty(directory)) {
    if (GENERATED_OUTPUT_PATTERN.test(filename)) await unlink(path.join(directory, filename));
    else throw new Error(`${directory} contains unmanaged file ${filename}; refusing replacement`);
  }
}

async function directoryExists(directory) {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function assertGeneratedDirectory(directory) {
  const filenames = await readdir(directory);
  if (filenames.length !== EXPECTED_OUTPUT_COUNT || filenames.some((filename) => !MANAGED_OUTPUT_PATTERN.test(filename))) {
    throw new Error(`${directory} contains ${filenames.length} files; exactly ${EXPECTED_OUTPUT_COUNT} managed outputs are required`);
  }

  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
  if (manifest.version !== 2 || Object.keys(manifest.assets || {}).length !== SCENE_IDS.length) {
    throw new Error(`${directory} has an invalid Movimento V2 manifest`);
  }

  const expectedFiles = new Set(["manifest.json"]);
  for (const asset of Object.values(manifest.assets)) {
    const derivatives = [
      asset.lqip,
      ...Object.values(asset.mobile.sources).flat(),
      ...Object.values(asset.desktop.sources).flat(),
    ];
    for (const derivative of derivatives) {
      const filename = path.basename(derivative.src);
      if (!MANAGED_OUTPUT_PATTERN.test(filename)) throw new Error(`${directory} manifest references unmanaged output ${filename}`);
      const buffer = await readFile(path.join(directory, filename));
      if (buffer.length !== derivative.bytes || sha256(buffer) !== derivative.sha256) {
        throw new Error(`${directory}/${filename} does not match its manifest digest`);
      }
      expectedFiles.add(filename);
    }
  }

  if (expectedFiles.size !== EXPECTED_OUTPUT_COUNT || filenames.some((filename) => !expectedFiles.has(filename))) {
    throw new Error(`${directory} file set does not match its manifest`);
  }
  return manifest;
}

export async function recoverInterruptedPromotion(
  finalDirectory = FINAL_OUTPUT_DIR,
  backupDirectory = BACKUP_DIR,
  validateDirectory = assertGeneratedDirectory,
) {
  const [finalExists, backupExists] = await Promise.all([
    directoryExists(finalDirectory),
    directoryExists(backupDirectory),
  ]);

  if (!finalExists && backupExists) {
    await rename(backupDirectory, finalDirectory);
    return "restored-backup";
  }

  if (finalExists && backupExists) {
    await validateDirectory(finalDirectory);
    return "validated-final-with-backup";
  }

  return "no-recovery-needed";
}

async function promoteStaging() {
  await assertGeneratedDirectory(STAGING_DIR);
  const [finalExists, backupExists] = await Promise.all([
    directoryExists(FINAL_OUTPUT_DIR),
    directoryExists(BACKUP_DIR),
  ]);

  if (backupExists) {
    if (!finalExists) throw new Error("Promotion backup exists without a final directory; recovery must run before promotion");
    await assertGeneratedDirectory(FINAL_OUTPUT_DIR);
    await clearGeneratedDirectory(BACKUP_DIR);
    await rmdir(BACKUP_DIR);
  }

  for (const filename of await readDirectoryOrEmpty(FINAL_OUTPUT_DIR)) {
    if (!GENERATED_OUTPUT_PATTERN.test(filename)) {
      throw new Error(`${FINAL_OUTPUT_DIR} contains unmanaged file ${filename}; refusing replacement`);
    }
  }

  try {
    await rename(FINAL_OUTPUT_DIR, BACKUP_DIR);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  let stagingWasPromoted = false;
  try {
    await rename(STAGING_DIR, FINAL_OUTPUT_DIR);
    stagingWasPromoted = true;
    await assertGeneratedDirectory(FINAL_OUTPUT_DIR);
  } catch (error) {
    try {
      if (stagingWasPromoted) await rename(FINAL_OUTPUT_DIR, STAGING_DIR);
      await rename(BACKUP_DIR, FINAL_OUTPUT_DIR);
    } catch (rollbackError) {
      if (rollbackError?.code !== "ENOENT") throw new AggregateError([error, rollbackError], "Failed to promote staging and restore previous output");
    }
    throw error;
  }

  await clearGeneratedDirectory(BACKUP_DIR);
  await rmdir(BACKUP_DIR);
}

async function main() {
  await recoverInterruptedPromotion();
  await clearGeneratedDirectory(STAGING_DIR);
  const assets = {};
  for (const id of SCENE_IDS) assets[id] = await buildAsset(id);

  const manifest = { version: 2, routes: ROUTES, assets };
  await assertOutput(manifest);
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const stagedFiles = await readdir(STAGING_DIR);
  if (stagedFiles.length !== EXPECTED_OUTPUT_COUNT || stagedFiles.some((filename) => !MANAGED_OUTPUT_PATTERN.test(filename))) {
    throw new Error(`Staging contains ${stagedFiles.length} files; exactly ${EXPECTED_OUTPUT_COUNT} managed outputs are required`);
  }
  await promoteStaging();
  process.stdout.write(`Built ${SCENE_IDS.length} Movimento V2 scene families.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
