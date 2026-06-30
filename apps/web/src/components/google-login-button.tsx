import Image from "next/image";
import { toast } from "sonner";
import GoogleIcon from "@/assets/google.svg";
import { Button } from "./ui/button";

export function GoogleLoginButton() {
  return (
    <Button
      className="w-full gap-2"
      type="button"
      variant="outline"
      onClick={() => {
        const base = process.env.NEXT_PUBLIC_API_URL;

        if (!base) {
          toast.error("Configuração incompleta", {
            description:
              "Ocorreu um erro ao configurar a conexão com o Google. Tente novamente.",
          });
          return;
        }

        window.location.assign(`${base}auth/google`);
      }}
    >
      <Image src={GoogleIcon} alt="Google" width={16} height={16} />
      Continuar com Google
    </Button>
  );
}
