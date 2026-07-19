package de.thm.mni.mailsystem.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SpaController {

    /** Handles top-level Angular routes, e.g. /login, /mails, /compose. */
    @GetMapping("/{path:[^\\.]*}")
    fun spaRoot(): String = "forward:/index.html"

    /** Handles nested Angular routes, e.g. /compose/42, /mail/detail/5. */
    @GetMapping("/**/{path:[^\\.]*}")
    fun spaDeep(): String = "forward:/index.html"
}