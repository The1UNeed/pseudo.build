// Simplified Chinese translation of content.en.tsx. Keep section ids identical.
import type { LegalContent } from "@/app/components/LegalPage";
import { githubUrl, productName, securityEmail } from "@/lib/seo-content";

export const securityZh: LegalContent = {
  eyebrow: "安全",
  title: "攻击面很小，且有针对性地加以防护。",
  summary: `${productName} 几乎所有功能都在你的浏览器中运行。本页说明哪些部分会接触服务器、它们如何受到保护，以及发现问题时如何告知我们。`,
  sections: [
    {
      id: "architecture",
      title: "1. 架构",
      content: (
        <>
          <p>
            编译器和运行时被编译为 WebAssembly，在你的浏览器标签页内执行。程序在一个 Web Worker 中运行，没有网络和文件系统访问权限，并设有指令预算和超时限制。伪代码从不会被发送到服务器运行。
          </p>
          <p>仅有以下组件在服务器端运行：</p>
          <ul>
            <li>由 Vercel 提供的静态页面和编辑器代码包。</li>
            <li>一个工作区同步 API，在验证你的会话后将请求转发至 Convex。</li>
            <li>Convex 数据库函数，为每位用户存储并返回一个工作区。</li>
          </ul>
          <p>以上组件均运行在位于美国的服务器上。</p>
        </>
      ),
    },
    {
      id: "auth",
      title: "2. 身份认证与访问控制",
      content: (
        <>
          <p>
            登录委托给 Clerk 处理。会话使用短期有效的 JSON Web Token。同步 API 仅在 Clerk 验证会话通过后才接受请求，并将你的令牌转发至 Convex；Convex 中的每个查询和变更操作在读写前都会再次校验身份。
          </p>
          <p>
            工作区按令牌中经验证的用户 ID 建立索引，绝不使用客户端提供的值。请求路径中不存在管理员绕过、共享密钥或服务角色。
          </p>
        </>
      ),
    },
    {
      id: "data",
      title: "3. 数据保护",
      content: (
        <ul>
          <li>
            所有流量均使用 HTTPS。每个响应都设置了 HSTS、严格的内容安全策略（CSP）以及标准的安全加固头。
          </li>
          <li>
            工作区数据在 API 路由和 Convex 中各校验一次，对大小、深度、节点数量和结构设有硬性限制。
          </li>
          <li>
            编辑器从我们自己的源加载 Monaco 及其 worker，而非第三方 CDN。
          </li>
          <li>
            密钥仅存放于 Vercel 和 Convex 的环境变量中。代码仓库不含任何凭据，若存在密钥文件，部署脚本将拒绝运行。
          </li>
          <li>依赖项在锁文件中固定版本，并在每次发布前对照已知安全公告进行审查。</li>
          <li>
            当你删除账号时，Clerk 会发送带签名的 Webhook，Convex 随即删除你的工作区和用户记录。
          </li>
        </ul>
      ),
    },
    {
      id: "incidents",
      title: "4. 如果发生安全事件",
      content: (
        <p>
          如果我们获悉发生了影响你个人信息的安全事件，我们将在不无故拖延的情况下通过电子邮件通知受影响的账号持有者，并在法律要求时告知监管机构，包括遵守 GDPR 和英国 GDPR 规定的 72 小时时限，以及《中华人民共和国个人信息保护法》规定的通知义务。
        </p>
      ),
    },
    {
      id: "reporting",
      title: "5. 报告安全漏洞",
      content: (
        <>
          <p>
            如果你认为发现了安全问题，请发送邮件至 <a href={`mailto:${securityEmail}`}>{securityEmail}</a>，或使用{" "}
            <a href={`${githubUrl}/security/advisories/new`} target="_blank" rel="noopener noreferrer">
              GitHub 私密漏洞报告
            </a>
            。请勿为安全问题创建公开的 issue。本政策的机器可读版本位于{" "}
            <a href="/.well-known/security.txt">/.well-known/security.txt</a>。
          </p>
          <p>
            请附上复现步骤、你认为的影响范围以及任何概念验证。你将在 7 天内收到确认，并在 30 天内收到状态更新。
          </p>
        </>
      ),
    },
    {
      id: "safe-harbor",
      title: "6. 研究者安全港",
      content: (
        <>
          <p>
            我们支持善意的安全研究。如果你遵守以下规则，我们不会采取法律行动，并会与你合作修复问题：
          </p>
          <ul>
            <li>仅针对你自己拥有或获得授权使用的账号进行测试。</li>
            <li>不访问、修改或删除其他用户的数据。</li>
            <li>不进行拒绝服务、垃圾信息或社会工程攻击。</li>
            <li>在公开披露前给我们合理的时间修复问题。</li>
          </ul>
        </>
      ),
    },
    {
      id: "self-host",
      title: "7. 运行你自己的副本",
      content: (
        <p>
          由于代码是开源的，你可以自行运行 {productName}。仓库中的 README 说明了所需的环境变量，以及如何为私有部署配置 Clerk 和 Convex。自托管实例不在本政策的适用范围内。
        </p>
      ),
    },
  ],
};
