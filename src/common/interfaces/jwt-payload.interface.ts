export class JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string | null;
}
