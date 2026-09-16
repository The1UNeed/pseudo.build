// Simplified Chinese translation of content.en.tsx. Keep section ids identical.
import Link from "next/link";
import type { LegalContent } from "@/app/components/LegalPage";
import { localePath } from "@/i18n/config";
import { contactEmail, githubUrl, productName } from "@/lib/seo-content";

export const termsZh: LegalContent = {
  eyebrow: "用户协议",
  title: "一款免费工具的简明条款。",
  summary: `本条款适用于 ${productName} 网站、浏览器编辑器以及可选的账号功能。使用本服务即表示你同意本条款。`,
  sections: [
    {
      id: "service",
      title: "1. 本服务是什么",
      content: (
        <>
          <p>
            {productName} 是一款免费开源的伪代码编辑器与编译器。它允许你编写伪代码、编译、在浏览器中运行、以流程图形式查看，并可选择将多文件工作区保存到你的账号。
          </p>
          <p>
            本服务由居住在新西兰的个人开发者 Alex Xin Liu 运营，而非公司。它作为免费的公共工具提供，并非商业产品。
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "2. 账号与年龄",
      content: (
        <>
          <p>
            使用编辑器无需账号。账号仅在使用云端工作区同步时需要。账号由我们的身份认证服务商 Clerk 管理。
          </p>
          <ul>
            <li>你必须提供准确的注册信息，并妥善保管你的登录凭据。</li>
            <li>你对在你账号下发生的活动负责。</li>
            <li>
              你可以随时发送邮件至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a> 要求删除你的账号。Clerk 账号被删除后，我们的数据库会删除该账号对应的已同步工作区和用户记录。
            </li>
            <li>
              创建账号须满足以下年龄要求：在美国和英国至少 13 岁，在中国大陆至少 14 岁，在欧盟成员国须达到当地的数字同意年龄（13 至 16 岁）。年龄较小的学生应在不登录的情况下使用编辑器，或由父母或监护人创建并管理账号。
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "your-content",
      title: "3. 你的内容",
      content: (
        <>
          <p>你创建的伪代码、文件和工作区布局归你所有。我们不主张对其拥有任何所有权。</p>
          <p>
            当你使用云端同步时，你授权我们仅在向你提供同步功能所必需的范围内存储和传输你的内容。我们不会阅读、出售你的工作区，也不会将其用于任何其他目的，包括训练软件。
          </p>
          <p>
            你同意不存储在你或我们所在地属于违法的内容、侵犯他人权利的内容，或含有恶意软件的内容。
          </p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "4. 可接受的使用",
      content: (
        <>
          <p>请勿：</p>
          <ul>
            <li>试图访问其他用户的账号或工作区。</li>
            <li>
              探测、扫描本服务或其服务商，或使其过载，但我们的<Link href={localePath("zh", "/security")}>安全政策</Link>允许的情形除外。
            </li>
            <li>以人力无法手动产生的频率自动向同步 API 发送请求。</li>
            <li>利用本服务传播垃圾信息、恶意软件或侮辱性内容。</li>
            <li>以违反你所在地法律的方式使用本服务。</li>
          </ul>
          <p>我们可能会暂停或删除违反上述规则的账号，除非法律禁止，否则我们会告知你原因。</p>
        </>
      ),
    },
    {
      id: "education",
      title: "5. 教育用途",
      content: (
        <>
          <p>
            编译器遵循我们所理解的剑桥国际（Cambridge International）为其计算机科学资格考试发布的伪代码规范。{productName} 是一个独立项目，与剑桥大学出版与评估（Cambridge University Press &amp; Assessment）或任何考试委员会均无隶属、认可或关联关系。
          </p>
          <p>
            评分标准对记法的接受或拒绝可能与本编译器不同。请使用本工具练习并检查你的逻辑，并以你的老师和教学大纲的要求为准来判断考试中可接受的写法。
          </p>
        </>
      ),
    },
    {
      id: "open-source",
      title: "6. 开源许可证",
      content: (
        <>
          <p>
            {productName} 的源代码依据 GNU 通用公共许可证第 3 版发布于{" "}
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              {githubUrl}
            </a>
            。该许可证约束你对代码的使用；本条款约束你对托管于 pseudo.build 的服务的使用。
          </p>
          <p>
            {productName} 的名称和标志用于标识本项目。你可以运行自己的软件副本，但请勿将分支版本冒充为官方服务。
          </p>
        </>
      ),
    },
    {
      id: "availability",
      title: "7. 可用性与变更",
      content: (
        <>
          <p>
            本服务免费提供，不作任何正常运行时间的保证。功能可能被更改、暂停或移除。在可行的情况下，对于影响已存储数据的变更，我们会至少提前 30 天在 GitHub 仓库中公告。
          </p>
          <p>请自行保留重要工作的副本，例如将代码从编辑器中复制出来。</p>
        </>
      ),
    },
    {
      id: "disclaimer",
      title: "8. 免责声明与责任限制",
      content: (
        <>
          <p>
            本服务按“现状”和“可用”状态提供，不附带任何明示或默示的保证，包括对特定用途的适用性和不侵权的保证。编译器遵循的是对通用伪代码规范的一种解释，并非官方考试工具。
          </p>
          <p>
            在法律允许的最大范围内，运营者不对因你使用本服务而产生的任何间接、附带、特殊或后果性损失（包括工作成果的丢失或考试分数的损失）承担责任。由于本服务是免费的，我们对任何索赔的总责任以 100 新西兰元为限。
          </p>
          <p>
            本条款中的任何内容均不限制因欺诈、因过失导致的死亡或人身伤害所产生的责任，也不限制你依据不可排除的消费者保护法律享有的任何权利，包括新西兰《消费者保障法》、英国《消费者权利法》、欧盟消费者法律以及《中华人民共和国消费者权益保护法》。
          </p>
        </>
      ),
    },
    {
      id: "termination",
      title: "9. 协议的终止",
      content: (
        <p>
          你可以随时停止使用本服务，并要求我们删除你的账号。如果你违反本条款，或我们停止提供本服务，我们可以终止或暂停你的访问。第 3、6、8 和 10 节在协议终止后继续适用。
        </p>
      ),
    },
    {
      id: "law",
      title: "10. 管辖法律与争议解决",
      content: (
        <>
          <p>
            本条款受新西兰法律管辖，争议将由新西兰法院处理。
          </p>
          <p>
            如果你是欧盟、英国或中国大陆的消费者，你仍享有所在国家强制性消费者法律的保护，并可向当地法院提起诉讼。
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "11. 本条款的变更",
      content: (
        <p>
          我们可能会更新本条款。本页顶部的生效日期显示当前版本，完整历史记录保存在仓库中。对于重大变更，我们将至少提前 14 天通过电子邮件通知账号持有者。变更生效后继续使用即表示你接受新条款。
        </p>
      ),
    },
    {
      id: "contact",
      title: "12. 联系方式",
      content: (
        <p>
          关于本条款的问题可发送至 <a href={`mailto:${contactEmail}`}>{contactEmail}</a>，或在{" "}
          <a href={`${githubUrl}/issues`} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          上提交 issue。有关账号或隐私事宜，请参阅<Link href={localePath("zh", "/privacy")}>隐私政策</Link>。
        </p>
      ),
    },
  ],
};
