import type { ImageSourcePropType } from "react-native";

/** Mesmos bytes do catálogo canônico em packages/category-assets/lineart-v1. */
export const CATEGORY_IMAGES: Readonly<Record<string, ImageSourcePropType>> = {
  PAREDE_ABDOMINAL: require("../../../assets/categories/lineart-v1/parede-abdominal.png"),
  PROSTATA_TRANSRETAL: require("../../../assets/categories/lineart-v1/prostata-transretal.png"),
  ESCROTAL: require("../../../assets/categories/lineart-v1/escrotal.png"),
  REGIAO_INGUINAL: require("../../../assets/categories/lineart-v1/regiao-inguinal.png"),
  PARATIREOIDE: require("../../../assets/categories/lineart-v1/paratireoide.png"),
  GLANDULAS_SALIVARES: require("../../../assets/categories/lineart-v1/glandulas-salivares.png"),
  DOPPLER_VENOSO_MMII: require("../../../assets/categories/lineart-v1/doppler-venoso-mmii.png"),
  DOPPLER_VENOSO_MMII_MEDIDAS: require("../../../assets/categories/lineart-v1/doppler-venoso-mmii-medidas.png"),
  DOPPLER_ARTERIAL_MMII: require("../../../assets/categories/lineart-v1/doppler-arterial-mmii.png"),
  DOPPLER_FISTULA_AV: require("../../../assets/categories/lineart-v1/doppler-fistula-av.png"),
  DOPPLER_RENAL: require("../../../assets/categories/lineart-v1/doppler-renal.png"),
  TRANSFONTANELA: require("../../../assets/categories/lineart-v1/transfontanela.png"),
  OCULAR: require("../../../assets/categories/lineart-v1/ocular.png"),
  LIVRE: require("../../../assets/categories/lineart-v1/livre.png"),
};
