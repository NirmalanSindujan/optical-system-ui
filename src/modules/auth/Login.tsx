// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { login as loginRequest, parseAuthPayload } from "@/modules/auth/auth.service";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "superadmin",
      password: "admin123"
    }
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data, values) => {
      const authData = parseAuthPayload(data, values.username);
      setAuth({
        token: authData.token || "dev-token-placeholder",
        role: authData.role ?? null,
        branchId: authData.branchId ?? null,
        username: authData.username
      });

      toast({
        title: "Login successful",
        description: `Welcome back, ${authData.username}.`
      });
      navigate("/app", { replace: true });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error?.response?.data?.message ?? "Invalid credentials or server unavailable."
      });
    }
  });

  const onSubmit = async (values) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Optical Multi-Branch Sales Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <Input placeholder="Enter username" {...register("username")} />
              {errors.username ? <p className="mt-1 text-xs text-destructive">{errors.username.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input type="password" placeholder="Enter password" {...register("password")} />
              {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password.message}</p> : null}
            </div>

            <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
