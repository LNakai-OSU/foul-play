/** Per-environment palettes. Every painter reads its colours from here, so one prop or wall can look native to any setting. */

export type EnvId = 'fete' | 'gallery' | 'station' | 'riverboat' | 'manor' | 'liner' | 'lodge' | 'studio' | 'restaurant' | 'train' | 'club' | 'theatre' | 'generic';
export type Tri = readonly [string, string, string];
export type ViewKind = 'garden' | 'sea' | 'river' | 'snow' | 'city' | 'night' | 'rail' | 'mountain' | 'lot' | 'hall';

export interface Skin {
  id: EnvId;
  /** furniture wood: light, mid, dark */
  wood: Tri;
  /** the wood floor */
  floor: Tri;
  metal: Tri;
  /** fabrics: primary (sofas, curtains), secondary (tablecloth), tertiary */
  cloth: Tri;
  /** interior wall face: base, shade, dado */
  wall: Tri;
  /** the dark band at the top of an interior wall */
  cap: readonly [string, string];
  accent: string;
  glow: string;
  glass: string;
  view: ViewKind;
  /** water: deep, mid, light, foam */
  water: readonly [string, string, string, string];
  snow: Tri;
  /** sky gradient: top, mid, horizon */
  sky: Tri;
  door: readonly [string, string];
}

const S = (s: Skin): Skin => s;

export const SKINS: Record<EnvId, Skin> = {
  generic: S({ id: 'generic', wood: ['#c98f5a', '#a56d3c', '#6a4424'], floor: ['#c98f5a', '#b07a48', '#a56d3c'], metal: ['#b4b4c0', '#7e7e8a', '#4a4a56'], cloth: ['#a83248', '#e8e0d0', '#3a5aa0'], wall: ['#d9c6a0', '#c9b58f', '#7d5c3c'], cap: ['#4b3a30', '#5e4a3c'], accent: '#f0d060', glow: '#ffd98a', glass: '#a6d2ee', view: 'night', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#3c4468', '#6a78a8', '#b0b8d8'], door: ['#8a5730', '#4a3020'] }),
  fete: S({ id: 'fete', wood: ['#d6a468', '#b17e46', '#6f4a26'], floor: ['#d9b27a', '#c49a62', '#a87e48'], metal: ['#c8ccd0', '#8e969e', '#59616a'], cloth: ['#c8412f', '#f0ead8', '#3f79bd'], wall: ['#ece2c6', '#d3c6a2', '#8a6a44'], cap: ['#5a4632', '#75603f'], accent: '#e8c040', glow: '#fff0b0', glass: '#b6dcf0', view: 'garden', water: ['#3e78b0', '#5c9ad0', '#92c4ea', '#f2fbff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#68b4f0', '#a4d6f8', '#e4f4ff'], door: ['#9a6a3a', '#4a3020'] }),
  gallery: S({ id: 'gallery', wood: ['#d8d0c0', '#b0a894', '#6e6656'], floor: ['#d2d0cc', '#bdbbb7', '#9d9b98'], metal: ['#d0d4d8', '#98a0a8', '#5c646c'], cloth: ['#23232b', '#e8e6e0', '#d84a3c'], wall: ['#f0efea', '#dcdad4', '#b6b4ae'], cap: ['#2a2a32', '#44444e'], accent: '#e2483a', glow: '#fff4d0', glass: '#a8cfe0', view: 'city', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#141a3a', '#2c3a72', '#6a78b8'], door: ['#9fc4d8', '#3a4a58'] }),
  station: S({ id: 'station', wood: ['#a0a8b0', '#7c858e', '#4c545c'], floor: ['#77838e', '#657079', '#525c65'], metal: ['#a9b6c0', '#7a8894', '#4a5662'], cloth: ['#e8772e', '#d6dde2', '#3f6f9a'], wall: ['#a9b6c0', '#8595a2', '#5c6b78'], cap: ['#3c4650', '#56626e'], accent: '#f08a3a', glow: '#bfe8ff', glass: '#b4dcf0', view: 'snow', water: ['#1c3a5a', '#2e5f86', '#5d92b8', '#e0f0fa'], snow: ['#e6f0fa', '#bfd3e6', '#89a9c8'], sky: ['#070d24', '#12305a', '#2a8a8a'], door: ['#e8772e', '#7a3c14'] }),
  riverboat: S({ id: 'riverboat', wood: ['#bf8a5e', '#8f5b38', '#573320'], floor: ['#d3b382', '#b8965f', '#8d6c3d'], metal: ['#c9b06a', '#8f7a3e', '#4d4020'], cloth: ['#8e2a36', '#efe4c6', '#2f5a48'], wall: ['#eadbb2', '#cdb98a', '#7a3a2c'], cap: ['#4a2a1c', '#6a3e2a'], accent: '#e6b640', glow: '#ffd070', glass: '#a8d0c0', view: 'river', water: ['#3d4a30', '#556640', '#7a8c58', '#b8c890'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#1c2440', '#5a4a6a', '#e0a070'], door: ['#f0e6cc', '#7a3a2c'] }),
  manor: S({ id: 'manor', wood: ['#94643e', '#6d4529', '#3e2716'], floor: ['#a86f3c', '#8d5a2d', '#6a4222'], metal: ['#d6b458', '#9a7a30', '#5a4418'], cloth: ['#7a2434', '#d8cfae', '#2c5a44'], wall: ['#8d4b48', '#6c3a3a', '#46301f'], cap: ['#2a1c16', '#43302a'], accent: '#dcae44', glow: '#ffd28a', glass: '#9cc0d8', view: 'garden', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#1c2140', '#3f4a78', '#8c86b0'], door: ['#5a3a24', '#2a1a10'] }),
  liner: S({ id: 'liner', wood: ['#c99a5e', '#9a6c38', '#5e3e1e'], floor: ['#c39152', '#a87a40', '#82592c'], metal: ['#e6e8ea', '#a4acb4', '#5e6670'], cloth: ['#c23c3c', '#f2ecd8', '#1f3f6e'], wall: ['#e6d8b4', '#c9b98e', '#5a3a26'], cap: ['#2a2f42', '#454c66'], accent: '#e8c048', glow: '#ffe0a0', glass: '#a2d0e8', view: 'sea', water: ['#1d3d6b', '#2e5f9a', '#5d8fc4', '#eef6fc'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#0e1a3a', '#2c4c86', '#e0b080'], door: ['#f4f0e4', '#2a3a5a'] }),
  lodge: S({ id: 'lodge', wood: ['#b8763c', '#8f5628', '#5a3517'], floor: ['#b47a40', '#966032', '#70462a'], metal: ['#8a8a92', '#5c5c66', '#34343c'], cloth: ['#a82a2a', '#e8dcc0', '#2f5a3a'], wall: ['#a56b3a', '#864f26', '#5a3517'], cap: ['#3a2416', '#553620'], accent: '#f0662e', glow: '#ffb060', glass: '#b6dcf0', view: 'mountain', water: ['#1c3a5a', '#2e5f86', '#5d92b8', '#e0f0fa'], snow: ['#f8fbff', '#d8e6f2', '#a2bcd4'], sky: ['#10183a', '#2e4a7a', '#9ab8d8'], door: ['#8a5228', '#3a2210'] }),
  studio: S({ id: 'studio', wood: ['#c8a070', '#9c7448', '#5f4428'], floor: ['#a89878', '#8c7d60', '#6c5f48'], metal: ['#b8bcc0', '#80868c', '#4a5056'], cloth: ['#b8323e', '#e8dcc0', '#2a3a5a'], wall: ['#d7cba9', '#bfb190', '#5c4a36'], cap: ['#3a3026', '#54483a'], accent: '#eab030', glow: '#ffe6a0', glass: '#a8c8d8', view: 'lot', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#241c4c', '#8a3f6a', '#f09a4a'], door: ['#8c2c2c', '#3a1010'] }),
  restaurant: S({ id: 'restaurant', wood: ['#7a4f34', '#5a3822', '#341f12'], floor: ['#3a2c30', '#2a2024', '#1a1418'], metal: ['#cdd3d8', '#8f99a2', '#545e68'], cloth: ['#f2eee6', '#7a1f34', '#c8a24a'], wall: ['#5a2a36', '#452029', '#2a1a1c'], cap: ['#1f1418', '#3a262c'], accent: '#d8ac4c', glow: '#ffd898', glass: '#a2c4d4', view: 'city', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#10122a', '#26264e', '#5a4a70'], door: ['#3a2a2a', '#1a1010'] }),
  train: S({ id: 'train', wood: ['#a26a44', '#7a4a2e', '#442a1a'], floor: ['#8a2c38', '#6e222c', '#4c1820'], metal: ['#dcb85a', '#a0802e', '#5c4818'], cloth: ['#7a2a3c', '#e8dcc0', '#28564a'], wall: ['#7c4430', '#5e3222', '#c9a24a'], cap: ['#2a1a14', '#4a3024'], accent: '#dcb040', glow: '#ffd890', glass: '#9cc4d8', view: 'rail', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#141a3c', '#3a4676', '#c08a72'], door: ['#5a3020', '#c9a24a'] }),
  club: S({ id: 'club', wood: ['#8a5a3a', '#653f26', '#3a2214'], floor: ['#5a3a2c', '#46291e', '#331c14'], metal: ['#b8a878', '#7e7050', '#463e2a'], cloth: ['#2e5f6a', '#a02c3c', '#e8dcc0'], wall: ['#34404e', '#28323e', '#5a2a30'], cap: ['#161c26', '#2c3644'], accent: '#ff4a86', glow: '#ff9ac0', glass: '#8cb4cc', view: 'city', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#0a0c1e', '#1c2044', '#3a3a66'], door: ['#5a5e66', '#2a2c32'] }),
  theatre: S({ id: 'theatre', wood: ['#a8703c', '#7e4e26', '#472c14'], floor: ['#8a5e38', '#6c4626', '#4e3018'], metal: ['#d8b458', '#9c7c2c', '#584416'], cloth: ['#9a1f34', '#e0c060', '#3a2a4a'], wall: ['#7a2233', '#5c1826', '#c9a040'], cap: ['#28100e', '#46261c'], accent: '#e2b446', glow: '#ffd890', glass: '#a2c4d4', view: 'hall', water: ['#2f5f9a', '#4a86c0', '#7fb2e0', '#e8f4ff'], snow: ['#f4f8fb', '#d6e4ef', '#a9c3d8'], sky: ['#160c1c', '#3a1c34', '#7a3a4a'], door: ['#7a1f30', '#c9a040'] }),
};
