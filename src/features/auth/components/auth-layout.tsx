import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="relative min-h-screen h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
        linear-gradient(to right, #d6d3d1 1px, transparent 1px),
        linear-gradient(to bottom, #d6d3d1 1px, transparent 1px)
      `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 0",
          maskImage: `
        repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)
      `,
          WebkitMaskImage: `
  repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)
      `,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />

      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
        linear-gradient(to right, #d6d3d1 1px, transparent 1px),
        linear-gradient(to bottom, #d6d3d1 1px, transparent 1px)
      `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 0",
          maskImage: `
            repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
           radial-gradient(ellipse 80% 80% at 100% 100%, #000 50%, transparent 90%)
      `,
          WebkitMaskImage: `
                   repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
           radial-gradient(ellipse 80% 80% at 100% 100%, #000 50%, transparent 90%)
      `,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />

      <Outlet />
    </div>
    // <div className="min-h-screen h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
    //   <div className="lg:size-full max-w-6xl max-h-[700px] bg-white rounded-2xl shadow-xl overflow-hidden flex">
    //     <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-br from-blue-900 via-blue-700 to-blue-800">
    //       <div className="relative z-10 p-8 flex flex-col justify-between text-white">
    //         <div className="flex items-center gap-3">
    //           <Logo className="size-10" />
    //           <span className="text-xl font-semibold">Pere Tantico</span>
    //         </div>

    //         <div className="space-y-8">
    //           <h2 className="text-[45px] font-bold tracking-tight leading-tight bg-linear-to-br from-white via-blue-50 to-cyan-100 bg-clip-text">
    //             Gestiona tu empresa de forma
    //             <span className="text-cyan-300"> eficiente</span>
    //           </h2>

    //           <div className="space-y-4 relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
    //             <blockquote className="text-2xl font-light leading-relaxed">
    //               "Todas lo que necesitas para gestionar de forma eficiente tu
    //               empresa de reparto."
    //             </blockquote>
    //           </div>
    //         </div>
    //       </div>

    //       <div className="absolute inset-0">
    //         <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-transparent via-white/5 to-transparent"></div>
    //         <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
    //         <div className="absolute bottom-32 left-16 w-24 h-24 bg-cyan-300/20 rounded-full blur-lg animate-float-delayed"></div>
    //         <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-purple-300/20 rounded-full blur-md animate-pulse"></div>
    //       </div>
    //     </div>

    //     <div className="flex items-center justify-center w-full lg:w-1/2 p-4 md:p-8 lg:p-12">
    //       <Outlet />
    //     </div>
    //   </div>
    // </div>
  );
}
