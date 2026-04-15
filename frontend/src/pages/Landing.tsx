import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ShieldCheck, QrCode, Video, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans selection:bg-green-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e8e8ed]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#1d1d1f] rounded-lg p-2 flex">
              <Leaf size={20} className="text-white" />
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-[#1d1d1f]">鲜果溯源</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-[#1d1d1f] hover:text-green-600 transition-colors">
              管理后台登录
            </Link>
            <Link to="/login" className="px-4 py-2 rounded-full bg-[#1d1d1f] text-white text-sm font-medium hover:bg-black transition-colors flex items-center gap-1">
              免费体验 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            鲜切水果追溯系统 v2.0 全新上线
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-[#1d1d1f] tracking-tight leading-tight mb-6">
            让每一口新鲜 <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700">都有迹可循</span>
          </h1>
          <p className="text-lg md:text-xl text-[#6e6e73] max-w-2xl mx-auto leading-relaxed mb-10">
            专为生鲜加工企业打造的数字化管理平台。通过视频监控、扫码溯源、多环节记录，建立消费者信任，提升品牌价值。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="px-8 py-4 rounded-full bg-[#1d1d1f] text-white text-lg font-medium hover:bg-black transition-transform hover:scale-105 flex items-center gap-2">
              立即开始使用
            </Link>
            <a href="#features" className="px-8 py-4 rounded-full bg-white text-[#1d1d1f] border border-[#d2d2d7] text-lg font-medium hover:bg-[#f5f5f7] transition-colors">
              了解更多
            </a>
          </div>
        </div>
      </section>

      {/* Product Image Mockup */}
      <div className="max-w-6xl mx-auto px-6 mb-24">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#e8e8ed] bg-white aspect-[16/9] md:aspect-[21/9]">
          <div className="absolute inset-0 bg-gradient-to-tr from-green-50 to-white flex items-center justify-center">
            {/* 示意图区域 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 w-full h-full">
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e8ed] p-6 flex flex-col items-center justify-center gap-4 hover:shadow-md transition-shadow">
                <QrCode size={48} className="text-green-500" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">一物一码</h3>
                  <p className="text-sm text-gray-500">消费者扫码查看完整档案</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e8ed] p-6 flex flex-col items-center justify-center gap-4 hover:shadow-md transition-shadow">
                <Video size={48} className="text-blue-500" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">生产监控</h3>
                  <p className="text-sm text-gray-500">加工过程视频同步录制上云</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e8ed] p-6 flex flex-col items-center justify-center gap-4 hover:shadow-md transition-shadow">
                <ShieldCheck size={48} className="text-indigo-500" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">食安背书</h3>
                  <p className="text-sm text-gray-500">时间轴记录确保证据不可篡改</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1d1d1f] mb-4">为什么选择我们</h2>
            <p className="text-lg text-[#6e6e73]">一套系统，解决企业生产管理与消费者信任双重难题</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Leaf className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">多企业租户支持</h3>
                  <p className="text-[#6e6e73] leading-relaxed">系统支持多企业独立入驻，数据完全隔离。超级管理员可管理所有企业资源，企业管理员专注自身业务运营。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <QrCode className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">便捷的扫码溯源</h3>
                  <p className="text-[#6e6e73] leading-relaxed">生产完成后自动生成批次溯源二维码，消费者使用微信/支付宝等任何工具扫一扫即可查看完整产品生命周期。</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Video className="text-orange-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">全方位可视化追踪</h3>
                  <p className="text-[#6e6e73] leading-relaxed">支持在生产加工环节录制视频上传，消费者可直接在溯源页面观看产品的切配、包装过程，眼见为实。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">专为一线员工优化</h3>
                  <p className="text-[#6e6e73] leading-relaxed">提供「快速操作」模式，大按钮设计，简化操作流程，戴手套也能轻松触控，极大提升车间录入效率。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#1d1d1f] text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">准备好提升您的品牌信任度了吗？</h2>
          <p className="text-xl text-gray-400 mb-10">现在加入，打造透明化、数字化现代生鲜加工厂。</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-green-500 text-white text-lg font-medium hover:bg-green-400 transition-colors">
            申请试用账号
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e8e8ed] py-12 text-center">
        <div className="max-w-6xl mx-auto px-6 text-[#6e6e73] text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf size={16} /> <span className="font-semibold text-[#1d1d1f]">鲜切水果全程追溯系统</span>
          </div>
          <p>© {new Date().getFullYear()} 保留所有权利. 致力于为生鲜行业提供最可靠的数字化溯源服务。</p>
        </div>
      </footer>
    </div>
  );
}
