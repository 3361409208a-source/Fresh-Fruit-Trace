import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Leaf, ShieldCheck, QrCode, Video, 
  Smartphone, BarChart3, Clock, Globe, Zap, Award, ChevronRight,
  Play, Package, Utensils, Truck, Factory, Database, Lock, Users2, Sparkles
} from 'lucide-react';

// Fade-in animation component
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div 
      style={{ 
        animation: `fadeInUp 0.8s ease-out ${delay}s both`,
        animationName: 'fadeInUp'
      }}
    >
      {children}
    </div>
  );
}

// Feature card with glass morphism
function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
        <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={28} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// Step card for how it works
function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-green-200 last:border-0 last:pb-0">
      <div className="absolute left-0 top-0 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center font-bold shadow-lg">
        {number}
      </div>
      <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-green-500/30">
              <Leaf size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">鲜果溯源</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">功能特性</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">工作原理</a>
            <a href="#tech-stack" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">技术架构</a>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-900 font-medium hover:text-green-600 transition-colors">
              登录
            </Link>
            <Link to="/login" className="px-5 py-2.5 rounded-full bg-gray-900 text-white font-medium hover:bg-black transition-all hover:shadow-lg hover:shadow-gray-900/20 flex items-center gap-2">
              免费试用 <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50"></div>
        
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <FadeIn delay={0}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg border border-green-100">
                  <Sparkles size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">企业级溯源系统</span>
                </div>
              </FadeIn>
              
              <FadeIn delay={0.1}>
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight">
                  全场景溯源<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-600 to-teal-500">
                    记录每一道工序
                  </span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  专为鲜切水果、外卖制作、快递打包等多场景打造的追溯系统。支持制作过程视频录制、二维码溯源、多租户管理，让消费者眼见为实。
                </p>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 transition-all">
                    <Play size={20} fill="currentColor" />
                    立即体验
                  </Link>
                  <a href="#scenarios" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-gray-900 font-semibold text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                    查看应用场景
                  </a>
                </div>
              </FadeIn>
              
              <FadeIn delay={0.4}>
                {/* Feature badges */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium text-sm">多场景支持</span>
                  <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">视频录制</span>
                  <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-medium text-sm">私有化部署</span>
                </div>
              </FadeIn>
            </div>
            
            {/* Hero visual */}
            <FadeIn delay={0.5}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 overflow-hidden">
                {/* Mock dashboard UI */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <QrCode className="text-green-600" size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">批次 #2024061501</p>
                        <p className="text-sm text-gray-500">西瓜切块 - 已完成溯源</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">已完成</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Video className="text-blue-600" size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">生产视频</p>
                        <p className="text-sm text-gray-500">加工过程已录制 15:32</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">录制中</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-900">12</p>
                      <p className="text-xs text-gray-500">今日批次</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-900">98%</p>
                      <p className="text-xs text-gray-500">合格率</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-900">156</p>
                      <p className="text-xs text-gray-500">扫码次数</p>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Application Scenarios Section */}
      <section id="scenarios" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Factory size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-3xl font-bold mb-4">多场景应用</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              支持多种业务场景，从生产到配送，全流程可追溯
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FadeIn delay={0}>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6">
                  <Factory size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">鲜切水果加工</h3>
                <p className="text-gray-400 leading-relaxed">
                  记录水果清洗、切配、包装全过程。消费者扫码可查看加工时间、操作人员、生产环境，确保食品安全。
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6">
                  <Utensils size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">外卖制作追溯</h3>
                <p className="text-gray-400 leading-relaxed">
                  餐厅后厨制作过程视频录制。消费者可查看菜品制作时间、厨师信息、食材来源，吃得放心。
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6">
                  <Package size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">快递打包记录</h3>
                <p className="text-gray-400 leading-relaxed">
                  物流打包过程全程记录。记录打包时间、打包人员、包装材料，避免运输途中调包或损坏纠纷。
                </p>
              </div>
            </FadeIn>
          </div>
          
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <FadeIn delay={0.3}>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6">
                  <Truck size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">物流配送追踪</h3>
                <p className="text-gray-400 leading-relaxed">
                  配送过程关键节点记录。记录出库、中转、送达时间，消费者可实时查看物流轨迹。
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.4}>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6">
                  <ShieldCheck size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">质量检测记录</h3>
                <p className="text-gray-400 leading-relaxed">
                  质检环节完整记录。记录检测人员、检测时间、检测结果，为食品安全提供可信证据。
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-green-600 font-semibold mb-4">核心功能</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              全流程数字化管理
            </h2>
            <p className="text-xl text-gray-600">
              从生产到消费者，每一个环节都清晰可见，构建完整的信任链条
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FadeIn delay={0}>
              <FeatureCard 
                icon={QrCode} 
                title="智能一物一码" 
                desc="自动生成唯一溯源二维码，支持微信/支付宝等全平台扫码，消费者无需下载APP即可查看完整产品档案。"
                color="bg-gradient-to-br from-green-400 to-green-600"
              />
            </FadeIn>
            <FadeIn delay={0.1}>
              <FeatureCard 
                icon={Video} 
                title="生产过程录制" 
                desc="支持在加工环节实时录制视频并上传云端，消费者可追溯观看切配、包装全过程，眼见为实。"
                color="bg-gradient-to-br from-blue-400 to-blue-600"
              />
            </FadeIn>
            <FadeIn delay={0.2}>
              <FeatureCard 
                icon={ShieldCheck} 
                title="多租户架构" 
                desc="支持多企业入驻，数据完全隔离。超级管理员可全局管控，企业管理员专注自身业务运营。"
                color="bg-gradient-to-br from-purple-400 to-purple-600"
              />
            </FadeIn>
            <FadeIn delay={0.3}>
              <FeatureCard 
                icon={BarChart3} 
                title="数据可视化" 
                desc="实时展示生产数据、扫码统计，支持导出报告，轻松应对监管部门检查。"
                color="bg-gradient-to-br from-orange-400 to-orange-600"
              />
            </FadeIn>
            <FadeIn delay={0.4}>
              <FeatureCard 
                icon={Users2} 
                title="权限管理" 
                desc="支持超级管理员、企业管理员、操作员多级权限，确保数据安全和操作规范。"
                color="bg-gradient-to-br from-pink-400 to-pink-600"
              />
            </FadeIn>
            <FadeIn delay={0.5}>
              <FeatureCard 
                icon={Smartphone} 
                title="移动端友好" 
                desc="响应式设计，支持手机、平板、扫码枪操作，戴手套也能轻松触控。"
                color="bg-gradient-to-br from-teal-400 to-teal-600"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <FadeIn delay={0}>
              <div>
                <p className="text-green-600 font-semibold mb-4">工作流程</p>
                <h2 className="text-4xl font-bold text-gray-900 mb-12">
                  三步开启数字化溯源
                </h2>
                
                <div className="space-y-8">
                  <FadeIn delay={0.1}>
                    <StepCard 
                      number="1" 
                      title="创建批次并录制生产视频" 
                      desc="在系统中创建新批次，选择产品类型，用手机或车间摄像头录制加工过程，视频自动上传云端存储。"
                    />
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <StepCard 
                      number="2" 
                      title="自动生成溯源二维码" 
                      desc="批次完成后，系统生成唯一溯源二维码，可批量下载打印标签，贴在产品包装上。"
                    />
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <StepCard 
                      number="3" 
                      title="消费者扫码查看" 
                      desc="消费者使用微信扫一扫，即可查看产品信息、生产视频、有效期倒计时，建立品牌信任。"
                    />
                  </FadeIn>
                </div>
              </div>
            </FadeIn>
            
            {/* Visual illustration */}
            <FadeIn delay={0.4}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Zap className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">扫码溯源</p>
                      <p className="text-sm text-gray-500">查看完整生产档案</p>
                    </div>
                    <ChevronRight className="text-gray-400" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Database className="mx-auto mb-2 text-blue-500" size={32} />
                      <p className="text-xs font-medium text-gray-600">数据记录</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Lock className="mx-auto mb-2 text-green-500" size={32} />
                      <p className="text-xs font-medium text-gray-600">安全存储</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <Globe className="mx-auto mb-2 text-purple-500" size={32} />
                      <p className="text-xs font-medium text-gray-600">随时可查</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-900 rounded-xl text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock size={20} />
                      <span className="font-medium">有效期倒计时</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">23:45:12</p>
                    <p className="text-sm text-gray-400 mt-1">建议在有效期内食用，确保最佳口感</p>
                  </div>
                </div>
              </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Enterprise Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-12 text-white">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <FadeIn delay={0}>
                <div>
                  <Award size={48} className="text-white mb-6" />
                  <h2 className="text-3xl font-bold mb-4">企业级解决方案</h2>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    支持私有化部署，数据完全自主可控。企业可根据自身业务需求进行定制化开发，打造专属的追溯系统。
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-sm">私有化部署</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-sm">多租户架构</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-sm">定制化开发</span>
                  </div>
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <ShieldCheck className="text-green-400" size={24} />
                    <div>
                      <p className="font-semibold">数据安全保障</p>
                      <p className="text-sm text-gray-400">JWT 认证 + bcrypt 加密</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <Database className="text-blue-400" size={24} />
                    <div>
                      <p className="font-semibold">MySQL 数据存储</p>
                      <p className="text-sm text-gray-400">可靠的关系型数据库</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <Video className="text-purple-400" size={24} />
                    <div>
                      <p className="font-semibold">视频录制存储</p>
                      <p className="text-sm text-gray-400">支持云端存储与回放</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <FadeIn delay={0}>
            <Award size={64} className="mx-auto text-white/80 mb-8" />
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              开始您的溯源之旅
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              专业的溯源解决方案，无论是小型餐饮店还是大型加工厂，都能快速搭建属于自己的追溯系统。
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-white text-green-700 font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
                立即开始使用
              </Link>
              <a href="#scenarios" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-white/10 text-white font-bold text-lg border-2 border-white/30 hover:bg-white/20 transition-all">
                <Factory size={20} />
                查看应用场景
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="text-white/60 mt-8 text-sm">私有化部署 · 数据自主可控 · 专业技术支持</p>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
                  <Leaf size={22} className="text-white" />
                </div>
                <span className="font-bold text-xl">鲜果溯源</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                专业的生鲜溯源解决方案，让每一份产品都可追溯、可验证、可信赖。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">功能特性</a></li>
                <li><a href="#" className="hover:text-white transition-colors">技术文档</a></li>
                <li><a href="#" className="hover:text-white transition-colors">部署指南</a></li>
                <li><a href="#" className="hover:text-white transition-colors">更新日志</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">支持</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">技术支持</a></li>
                <li><a href="#" className="hover:text-white transition-colors">商务合作</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} 鲜切水果全程追溯系统. All rights reserved.</p>
            <div className="flex gap-6 text-gray-500 text-sm">
              <a href="#" className="hover:text-white transition-colors">隐私政策</a>
              <a href="#" className="hover:text-white transition-colors">服务条款</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
