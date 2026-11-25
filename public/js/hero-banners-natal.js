const cloudinary = 'https://res.cloudinary.com/etoqnuvw/image/upload/';

export const natalBanners = [
  ["Canecas de Chopp Natalinas Personalizadas", "Canecas_de_Chopp_Natalinas_Personalizadas.png", 2172, 724],
  ["Outros Itens Personalizados de Natal-5", "Outros_Itens_Personalizados_de_Natal-5.png", 2172, 724],
  ["Camisetas e Bodies Natalinos Personalizados-4", "Camisetas_e_Bodies_Natalinos_Personalizados-4.png", 2152, 731],
  ["Presentes de Natal Personalizados Artize-3", "Presentes_de_Natal_Personalizados_Artize-3.png", 2152, 731],
  ["Kits de Natal Personalizados Festivos-2", "Kits_de_Natal_Personalizados_Festivos-2.png", 2152, 731],
  ["Canecas Personalizadas de Natal-1", "Canecas_Personalizadas_de_Natal-1.png", 2172, 724],
  ["Canecas de Chopp Natalinas Personalizadas-6", "Canecas_de_Chopp_Natalinas_Personalizadas-6.png", 2172, 724],
  ["Garrafas Térmicas Personalizadas de Natal-5", "Garrafas_T%C3%A9rmicas_Personalizadas_de_Natal-5.png", 2172, 724],
  ["Camisetas e Bodies Natalinos Personalizados-3", "Camisetas_e_Bodies_Natalinos_Personalizados-3.png", 2172, 724],
  ["Garrafas Térmicas Personalizadas de Natal-4", "Garrafas_T%C3%A9rmicas_Personalizadas_de_Natal-4.png", 2172, 724],
  ["Camisetas e Bodies Personalizados de Natal-2", "Camisetas_e_Bodies_Personalizados_de_Natal-2.png", 2172, 724],
  ["Ofertas de Garrafas Personalizadas Natalinas", "Ofertas_de_Garrafas_Personalizadas_Natalinas.png", 2172, 724],
  ["Banner Natalino de Canecas Personalizadas", "Banner_Natalino_de_Canecas_Personalizadas.png", 2172, 724],
  ["Canecas Personalizadas_ Natal Criativo-1", "Canecas_Personalizadas__Natal_Criativo-1.png", 2172, 724],
  ["Canecas Personalizadas de Natal-6", "Canecas_Personalizadas_de_Natal-6.png", 2172, 724]
].map(([title, file, width, height]) => ({ title, url: cloudinary + file, width, height }));
