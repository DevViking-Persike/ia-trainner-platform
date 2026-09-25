export interface AuthUserInfo {
  id: string;
  email: string;
  nome: string;
  instituicao: string;
  departamento: string;
  area_pesquisa: string;
  titulacao: string;
  lattes_url?: string;
  orcid_id?: string;
  telefone?: string;
  bio?: string;
  plano: string;
  limite_jobs: number;
}
