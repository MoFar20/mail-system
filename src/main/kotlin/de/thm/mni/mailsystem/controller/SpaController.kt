package de.thm.mni.mailsystem.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.RequestMapping

@Controller
class SpaController {

    @RequestMapping(value = [
        "/login", 
        "/register",
        "/compose", 
        "/inbox", 
        "/sent", 
        "/drafts", 
        "/mails", 
        "/mails/**"
    ])
    fun forwardToSpa(): String {
        return "forward:/index.html"
    }
}