// Tudo aqui acompanha o desenho de client/public/map.jpg, em pixels da imagem original.
// Se a imagem mudar, as posicoes e os caminhos precisam ser medidos de novo.
export const MAP_WIDTH = 1455;
export const MAP_HEIGHT = 932;

// pinRight: o pin vai no lado direito da placa quando o esquerdo cobriria o quadrado de uma rota.
const city = (slug, name, x, y, pinRight = false) => ({ slug, name, kind: 'city', x, y, width: 134, height: 30, pinRight });

const route = (number, x, y, path = null) => ({
  slug: `rota-${number}`,
  name: `Rota ${number}`,
  kind: 'route',
  x,
  y,
  width: 84,
  height: 28,
  path,
});

export const MAP_AREAS = [
  city('yuni-city', 'Yuni City', 256, 234),
  city('maless-city', 'Maless City', 564, 253),
  city('dobel-city', 'Dobel City', 810, 284),
  city('bruny-city', 'Bruny City', 1114, 251),
  city('owani-city', 'Owani City', 903, 376, true),
  city('baldock-city', 'Baldock City', 369, 472),
  city('rodulan-city', 'Rodulan City', 577, 481, true),
  city('nagomi-city', 'Nagomi City', 828, 486),
  city('alocen-city', 'Alocen City', 1053, 507),
  city('kendal-city', 'Kendal City', 276, 622),
  city('olney-city', 'Olney City', 496, 627),
  city('vimory-city', 'Vimory City', 765, 664),
  city('kyonan-city', 'Kyonan City', 1018, 748),

  route('01', 323, 549, [[360, 484], [279, 610]]),
  route('02', 443, 552, [[380, 484], [483, 616]]),
  route('03', 540, 549, [[567, 492], [501, 615]]),
  route('04', 324, 381, [[264, 245], [361, 460]]),
  route('05', 458, 369, [[546, 264], [379, 460]]),
  route('06', 575, 361, [[561, 265], [575, 470]]),
  route('07', 477, 460, [[432, 477], [513, 479]]),
  route('08', 658, 567, [[588, 493], [726, 653]]),
  route('09', 709, 484, [[641, 484], [764, 479]]),
  route('10', 674, 405, [[594, 470], [791, 295]]),
  route('11', 789, 574, [[816, 498], [739, 653]]),
  route('12', 920, 614, [[834, 498], [999, 736]]),
  route('13', 874, 333, [[820, 296], [901, 365]]),
  route('14', 978, 415, [[928, 388], [1061, 495]]),
  route('15', 1043, 672, [[1071, 518], [1016, 737]]),
  route('16', 1018, 303, [[932, 364], [1093, 263]]),
  route('17', 1108, 367, [[1114, 263], [1078, 496]]),
  // O desenho nao traz linha pontilhada para esta rota, so o quadrado ao lado de Alocen City.
  route('18', 1165, 507),
];

export const findArea = (slug) => MAP_AREAS.find((area) => area.slug === slug);
