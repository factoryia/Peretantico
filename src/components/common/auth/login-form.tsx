import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

export function LoginForm() {
  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl min-h-[70%] max-h-[700px] h-full bg-white rounded-2xl shadow-xl overflow-hidden flex">
        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-900 via-blue-700 to-blue-800">
          {/* Remove the Image and overlay divs completely */}

          <div className="relative z-10 p-8 flex flex-col justify-between text-white">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
              <span className="text-xl font-semibold">Pere Tantico</span>
            </div>

            {/* Quote */}
            <div className="space-y-4">
              <blockquote className="text-2xl font-light leading-relaxed">
                "Todas las herramientas que necesitas para gestionar de forma
                eficiente tu empresa de reparto."
              </blockquote>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                Bienvenido a Pere Tantico
              </h1>
              <p className="text-gray-600 text-sm">
                Administra tu empresa de forma eficiente desde un solo lugar.
              </p>
            </div>

            {/* Login Form */}
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-gray-700">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value="alex.jordan@gmail.com"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  readOnly
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-700">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value="••••••••••"
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  readOnly
                />
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Olvidaste tu contraseña?
                </button>
              </div>

              {/* Login Button */}
              <Button className="w-full h-12 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-800 text-white font-medium rounded-lg">
                Iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
