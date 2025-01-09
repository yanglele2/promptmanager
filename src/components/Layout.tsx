import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  FiHome,
  FiMenu,
  FiX,
  FiMessageSquare,
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiList,
  FiPlusCircle,
  FiSettings,
  FiTag,
} from 'react-icons/fi'
import { useRouter } from 'next/router'
import Link from 'next/link'
import clsx from 'clsx'

const navigation = [
  { name: '首页', href: '/', icon: FiHome },
  { name: '提示词', href: '/prompts', icon: FiFileText },
  {
    name: '聊天',
    icon: FiMessageSquare,
    children: [
      { name: '聊天列表', href: '/chat', icon: FiList },
      { name: '新建聊天', href: '/chat/new', icon: FiPlusCircle },
    ],
  },
  { name: '标签管理', href: '/tags', icon: FiTag },
  { name: '设置', href: '/settings', icon: FiSettings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 移动端侧边栏 */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                    <span className="sr-only">关闭侧边栏</span>
                    <FiX className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <span className="text-xl font-bold">提示词管理器</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => 
                            !item.children ? (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className={clsx(
                                    router.pathname === item.href
                                      ? 'bg-gray-50 text-indigo-600'
                                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                >
                                  <item.icon
                                    className={clsx(
                                      router.pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                                      'h-6 w-6 shrink-0'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            ) : (
                              <li key={item.name}>
                                <div className="relative">
                                  <button
                                    type="button"
                                    className={clsx(
                                      router.pathname.startsWith(item.children[0].href)
                                        ? 'bg-gray-50 text-indigo-600'
                                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                      'flex items-center w-full text-left rounded-md p-2 gap-x-3 text-sm leading-6 font-semibold'
                                    )}
                                    onClick={() => {
                                      const el = document.getElementById(`${item.name}-submenu`)
                                      if (el) {
                                        el.classList.toggle('hidden')
                                      }
                                    }}
                                  >
                                    <item.icon
                                      className={clsx(
                                        router.pathname.startsWith(item.children[0].href)
                                          ? 'text-indigo-600'
                                          : 'text-gray-400 group-hover:text-indigo-600',
                                        'h-6 w-6 shrink-0'
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                    <FiChevronDown
                                      className={clsx(
                                        'ml-auto h-5 w-5 shrink-0',
                                        router.pathname.startsWith(item.children[0].href)
                                          ? 'text-indigo-600'
                                          : 'text-gray-400'
                                      )}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <div id={`${item.name}-submenu`} className="hidden">
                                    {item.children.map((subItem) => (
                                      <Link
                                        key={subItem.name}
                                        href={subItem.href}
                                        className={clsx(
                                          router.pathname === subItem.href
                                            ? 'bg-gray-50 text-indigo-600'
                                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                          'flex gap-x-3 rounded-md p-2 pl-11 text-sm leading-6'
                                        )}
                                      >
                                        <subItem.icon
                                          className={clsx(
                                            router.pathname === subItem.href
                                              ? 'text-indigo-600'
                                              : 'text-gray-400 group-hover:text-indigo-600',
                                            'h-6 w-6 shrink-0'
                                          )}
                                          aria-hidden="true"
                                        />
                                        {subItem.name}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              </li>
                            )
                          )}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* 桌面端侧边栏 */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-xl font-bold">提示词管理器</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => 
                    !item.children ? (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={clsx(
                            router.pathname === item.href
                              ? 'bg-gray-50 text-indigo-600'
                              : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={clsx(
                              router.pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ) : (
                      <li key={item.name}>
                        <div className="relative">
                          <button
                            type="button"
                            className={clsx(
                              router.pathname.startsWith(item.children[0].href)
                                ? 'bg-gray-50 text-indigo-600'
                                : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                              'flex items-center w-full text-left rounded-md p-2 gap-x-3 text-sm leading-6 font-semibold'
                            )}
                            onClick={() => {
                              const el = document.getElementById(`${item.name}-submenu-desktop`)
                              if (el) {
                                el.classList.toggle('hidden')
                              }
                            }}
                          >
                            <item.icon
                              className={clsx(
                                router.pathname.startsWith(item.children[0].href)
                                  ? 'text-indigo-600'
                                  : 'text-gray-400 group-hover:text-indigo-600',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                            <FiChevronDown
                              className={clsx(
                                'ml-auto h-5 w-5 shrink-0',
                                router.pathname.startsWith(item.children[0].href)
                                  ? 'text-indigo-600'
                                  : 'text-gray-400'
                              )}
                              aria-hidden="true"
                            />
                          </button>
                          <div id={`${item.name}-submenu-desktop`} className="hidden">
                            {item.children.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={clsx(
                                  router.pathname === subItem.href
                                    ? 'bg-gray-50 text-indigo-600'
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                  'flex gap-x-3 rounded-md p-2 pl-11 text-sm leading-6'
                                )}
                              >
                                <subItem.icon
                                  className={clsx(
                                    router.pathname === subItem.href
                                      ? 'text-indigo-600'
                                      : 'text-gray-400 group-hover:text-indigo-600',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 lg:mx-auto">
          <div className="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">打开侧边栏</span>
              <FiMenu className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1"></div>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                {/* 添加用户头像等其他内容 */}
              </div>
            </div>
          </div>
        </div>

        <main className="py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 