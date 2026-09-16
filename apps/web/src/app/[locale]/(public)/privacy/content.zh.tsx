// Simplified Chinese translation of content.en.tsx. Keep section ids identical.
import Link from "next/link";
import type { LegalContent } from "@/app/components/LegalPage";
import { contactEmail, githubUrl, productName } from "@/lib/seo-content";

const providers = [
  { name: "Vercel Inc.", role: "网站托管、API 路由、请求日志以及隐私友好的统计分析", country: "美国", policy: "https://vercel.com/legal/privacy-policy" },
  { name: "Clerk, Inc.", role: "身份认证与账号管理", country: "美国", policy: "https://clerk.com/legal/privacy" },
  { name: "Convex, Inc.", role: "存储已同步工作区的数据库", country: "美国", policy: "https://www.convex.dev/legal/privacy" },
];

export const privacyZh: LegalContent = {
  eyebrow: "隐私政策",
  title: "我们只收集产品运行所必需的最少数据。",
  summary: `本政策说明 ${productName} 处理哪些数据、处理的原因、数据存储在何处以及如何删除。简而言之：除非你登录并开启云端同步，否则任何数据都不会离开你的浏览器。`,
  sections: [
    {
      id: "controller",
      title: "1. 责任主体",
      content: (
        <>
          <p>
            {productName} 由居住在新西兰的个人开发者 Alex Xin Liu 运营，其为本政策所述数据的个人信息处理者（在欧盟和英国称为数据控制者）。本服务背后没有公司、没有广告，也没有数据经纪商。
          </p>
          <p>
            如需提出任何隐私请求，请发送邮件至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>。请勿在公开的 GitHub issue 中填写个人信息。
          </p>
        </>
      ),
    },
    {
      id: "summary",
      title: "2. 我们收集的数据一览",
      content: (
        <table>
          <thead>
            <tr>
              <th>数据</th>
              <th>何时收集</th>
              <th>存储位置</th>
              <th>保存期限</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>你的伪代码与工作区布局</td>
              <td>编辑期间始终存在</td>
              <td>仅在你的浏览器中。只有当你登录并保存时才会存储到 Convex。</td>
              <td>直至你删除它或删除账号。</td>
            </tr>
            <tr>
              <td>电子邮箱、姓名、头像、登录方式</td>
              <td>仅在你创建账号时</td>
              <td>Clerk。邮箱和姓名还会复制到 Convex，与你的工作区一同存放。</td>
              <td>直至你删除账号。</td>
            </tr>
            <tr>
              <td>汇总的页面访问量与加载耗时</td>
              <td>仅在公开网站的生产环境</td>
              <td>Vercel Analytics 与 Speed Insights。不使用 Cookie，不进行跨站跟踪。</td>
              <td>仅保留汇总数据。Vercel 在 24 小时后丢弃每日访客哈希值。</td>
            </tr>
            <tr>
              <td>请求日志（IP 地址、用户代理、路径、时间戳）</td>
              <td>每次请求</td>
              <td>Vercel</td>
              <td>按 Vercel 的短期日志保留期限，用于运维与防滥用。</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      id: "no-account",
      title: "3. 不使用账号时如何使用编辑器",
      content: (
        <>
          <p>
            编译器和运行时通过 WebAssembly 完全在你的浏览器中运行。你的代码从不会被发送到服务器进行编译或执行，我们也无法看到它。
          </p>
          <p>
            在公开网站上，未登录的会话仅将工作区保存在内存中，关闭标签页后即消失。在 localhost 或桌面版中，工作区会保存到浏览器的 IndexedDB，以便刷新后仍然保留。主题、面板尺寸和自动保存偏好保存在本地存储中。你可以通过浏览器设置清除以上全部内容。
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "4. 账号与云端同步",
      content: (
        <>
          <p>
            当你登录时，身份认证由 <a href="https://clerk.com" target="_blank" rel="noopener noreferrer">Clerk</a> 处理。Clerk 会存储你的电子邮箱、姓名、头像、登录方式和会话信息。Clerk 设置的 Cookie 仅为维持登录状态所严格必需，不会设置任何广告或统计分析 Cookie。
          </p>
          <p>
            当你保存工作区时，数据会通过 HTTPS 发送到我们的 <a href="https://convex.dev" target="_blank" rel="noopener noreferrer">Convex</a> 数据库，并与你的 Clerk 用户 ID 关联存储，同时附带你的电子邮箱和姓名以便识别记录。工作区有大小限制，并会在存储前进行校验。
          </p>
          <p>
            只有你本人可以读取你的工作区。每次请求都会在 API 层和数据库函数内部验证你的 Clerk 会话令牌，以此强制执行访问控制。我们不会阅读、分析你的工作区，也不会用它训练任何模型。
          </p>
        </>
      ),
    },
    {
      id: "purposes",
      title: "5. 处理数据的目的与法律依据",
      content: (
        <>
          <p>我们仅出于以下目的处理个人信息：</p>
          <ul>
            <li>
              <strong>提供编辑器、你的账号以及云端同步。</strong>在欧盟和英国的法律依据：履行合同（GDPR 第 6(1)(b) 条）。在中国：为提供你所请求的服务所必需（《中华人民共和国个人信息保护法》第 13 条第（2）项），以及你在注册时作出的同意。
            </li>
            <li>
              <strong>保障服务安全并防止滥用</strong>，为此使用请求日志。法律依据：我们运营安全服务的正当利益（第 6(1)(f) 条）。
            </li>
            <li>
              <strong>了解汇总使用情况</strong>，在公开网站上使用无 Cookie 的统计分析。法律依据：正当利益。不会建立任何个人画像。
            </li>
            <li>
              <strong>遵守法律</strong>，例如回应合法的法律请求（第 6(1)(c) 条）。
            </li>
          </ul>
          <p>
            我们不会对你作出自动化决策，不会对你进行用户画像，也不会将你的数据用于广告。
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "6. Cookie、本地存储与统计分析",
      content: (
        <>
          <p>
            公开网站本身不设置任何 Cookie。登录后会设置 Clerk 的会话 Cookie（例如 <code>__session</code> 和 <code>__client_uat</code>），这些 Cookie 为账号功能所严格必需，因此根据欧盟《电子隐私指令》和英国 PECR 无需征得同意。
          </p>
          <p>
            Vercel Analytics 与 Speed Insights 仅在生产环境的网站上运行。它们不使用 Cookie，也不进行设备指纹识别：访客通过请求的加盐哈希值识别，最多保留 24 小时，之后哈希值即被丢弃（参见 <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel 的分析隐私说明</a>）。本地版和桌面版不会加载它们。我们不运行任何广告或第三方营销脚本，因此也不存在需要你选择退出的内容。
          </p>
          <p>本地存储与 IndexedDB 仅按第 3 节所述方式使用，数据永远不会离开你的设备。</p>
        </>
      ),
    },
    {
      id: "transfers",
      title: "7. 数据存储位置与跨境传输",
      content: (
        <>
          <p>
            我们的服务商将数据存储在位于美国的服务器上。如果你在美国以外使用本服务，你的账号数据和已同步的工作区将被传输至美国。
          </p>
          <table>
            <thead>
              <tr>
                <th>接收方</th>
                <th>目的</th>
                <th>所在国家</th>
                <th>隐私政策</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.name}>
                  <td>{provider.name}</td>
                  <td>{provider.role}</td>
                  <td>{provider.country}</td>
                  <td>
                    <a href={provider.policy} target="_blank" rel="noopener noreferrer">
                      链接
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong>欧盟、欧洲经济区及英国。</strong>跨境传输依据服务商的数据处理协议进行，该协议采用欧盟标准合同条款和英国国际数据传输附录；若服务商已通过认证，则依据欧盟—美国数据隐私框架。
          </p>
          <p>
            <strong>中国大陆。</strong>根据《中华人民共和国个人信息保护法》，我们在此告知你：上表所列位于美国的接收方将接收你的电子邮箱、姓名、头像以及已同步的工作区，仅用于为你提供账号和云端同步服务，传输方式为经 HTTPS 加密的传输。我们会在你创建账号时单独征求你对该项向境外提供个人信息的同意。你可以随时通过删除账号撤回该同意，并可通过我们（<a href={`mailto:${contactEmail}`}>{contactEmail}</a>）向上述接收方行使你的权利。如果你不希望数据离开中国，请在不登录的情况下使用编辑器：此时不会发生任何传输。
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "8. 保存期限与删除",
      content: (
        <>
          <p>
            已同步的工作区和你的用户记录会一直保存，直至你删除它们或删除账号。在编辑器的“设置”中删除账号会移除你的 Clerk 资料，Clerk 随即通知我们的数据库删除你的工作区和用户记录。服务商的备份可能在此后继续保留一段有限的时间。
          </p>
          <p>
            请求日志由 Vercel 保留一段短暂的运维期限，统计分析数据仅以汇总形式保留，因此二者此后都无法追溯到你本人。
          </p>
          <p>
            你也可以发送邮件至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a> 请求获取数据副本或删除数据。我们会在 30 天内答复，该期限符合 GDPR、英国 GDPR、《个人信息保护法》以及美国各州隐私法规定的时限。
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "9. 我们与谁共享数据",
      content: (
        <>
          <p>
            我们不出售个人信息，也不会为定向广告或美国各州隐私法所称的“跨情境行为广告”而共享个人信息。数据仅由第 7 节所列服务商处理，各服务商均依据其自身的数据处理协议按我们的指示行事。
          </p>
          <p>
            在法律要求的情况下，例如为遵守有效的法院命令，或为保护本服务及其用户的安全，我们可能会披露数据。
          </p>
        </>
      ),
    },
    {
      id: "rights",
      title: "10. 你的权利",
      content: (
        <>
          <p>
            无论你身处何地，你都可以查阅、更正、导出和删除你的数据，并可通过删除账号撤回同意。此外：
          </p>
          <ul>
            <li>
              <strong>欧盟、欧洲经济区及英国（GDPR 与英国 GDPR）：</strong>你可以限制或反对处理，以可移植的格式获取你的数据，并向你所在国家的监管机构或英国信息专员办公室（ICO）投诉。
            </li>
            <li>
              <strong>美国（各州隐私法，如 CCPA/CPRA）：</strong>你可以知悉我们收集的内容，删除、更正它，且不会因行使这些权利而受到歧视。我们不出售或共享个人信息，因此不存在需要选择退出的内容。
            </li>
            <li>
              <strong>中国大陆（《个人信息保护法》）：</strong>你有权知悉并决定你的个人信息如何被处理，限制或拒绝处理，查阅并复制，更正，删除，要求我们解释处理规则，以及撤回同意。在法律允许的范围内，你的近亲属可在你去世后行使这些权利。
            </li>
            <li>
              <strong>新西兰（《2020 年隐私法》）：</strong>你可以请求查阅和更正你的信息，并向隐私专员办公室投诉。
            </li>
          </ul>
          <p>
            如需行使任何权利，请使用应用内的删除功能或发送邮件至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>。我们可能会要求你通过账号绑定的邮箱确认身份。
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "11. 儿童与学生",
      content: (
        <>
          <p>
            编辑器无需账号即可使用，适合任何年龄的学生。对于未登录的访问者，除上文所述的请求日志和汇总统计外，不会收集任何数据。
          </p>
          <p>
            账号仅面向在其所在地已达到可同意数据处理年龄的用户：美国（COPPA）和英国为 13 岁，中国大陆为 14 岁，欧盟各成员国为 13 至 16 岁不等。如果你未达到该年龄，请在不登录的情况下使用编辑器，或请父母或监护人为你创建并管理账号。我们不会明知而保留属于更低龄儿童的账号；如果你认为存在此类账号，请发送邮件告知我们，我们将予以删除。
          </p>
          <p>
            学校和教师在课堂上使用编辑器无需签署数据协议，因为除非学生主动选择登录，否则不会有任何学生数据传送给我们。
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "12. 安全",
      content: (
        <p>
          所有流量均通过 HTTPS 加密，对工作区的访问在每次请求时都会进行验证，密钥不会出现在代码中。如果发生影响你数据的安全事件，我们将依法通知你和相关监管机构。详情请参阅<Link href="/zh/security">安全页面</Link>。
        </p>
      ),
    },
    {
      id: "changes",
      title: "13. 政策变更",
      content: (
        <p>
          如果我们处理的数据发生变化，我们会更新本政策。上方的生效日期反映当前版本，所有历史版本均可在
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            仓库历史记录
          </a>
          中查阅。对于影响账号持有者的重大变更，我们将通过电子邮件通知你。
        </p>
      ),
    },
  ],
};
